import { db, Prisma } from "@acme/db";

import type {
  CaseContext,
  EndVoiceResult,
  FinishReason,
  StartVoiceInput,
  TranscriptPiece,
  VoiceCall,
  VoiceRepository,
} from "./types";

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string | null => (typeof value === "string" ? value : null);

async function lockedCall<T>(
  callId: string,
  action: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM call_sessions WHERE id = ${callId} FOR UPDATE`;
    return action(tx);
  });
}

async function toVoiceCall(call: {
  id: string;
  organizationId: string;
  caseId: string;
  actorUserId: string;
  policyVersion: number;
  policySnapshot: string;
  providerSessionId: string | null;
  outcomeKind: string | null;
}): Promise<VoiceCall> {
  const [company, collectionCase] = await Promise.all([
    db.companySettings.findUnique({ where: { organizationId: call.organizationId } }),
    db.collectionCase.findFirst({
      where: { id: call.caseId, organizationId: call.organizationId },
    }),
  ]);
  if (!company || !collectionCase) throw new Error("Call context is unavailable");
  return {
    callId: call.id,
    organizationId: call.organizationId,
    caseId: call.caseId,
    actorUserId: call.actorUserId,
    policyVersion: call.policyVersion,
    policySnapshot: call.policySnapshot,
    companyName: company.displayName,
    callbackPhone: company.callbackPhone,
    providerSessionId: call.providerSessionId,
    outcomeKind: call.outcomeKind,
  };
}

export function createPrismaVoiceRepository(): VoiceRepository {
  return {
    async loadPendingCall(input: Omit<StartVoiceInput, "sdpOffer">) {
      const call = await db.callSession.findFirst({
        where: {
          id: input.callId,
          caseId: input.caseId,
          actorUserId: input.actorUserId,
          connectionState: "pending",
          endedAt: null,
        },
      });
      if (!call || call.activeCaseId !== input.caseId || call.providerSessionId)
        throw new Error("Call reservation is unavailable");
      const [member, collectionCase] = await Promise.all([
        db.member.findFirst({
          where: { organizationId: call.organizationId, userId: input.actorUserId },
        }),
        db.collectionCase.findFirst({
          where: { id: input.caseId, organizationId: call.organizationId },
        }),
      ]);
      if (
        !member ||
        !["admin", "agent"].includes(member.role) ||
        collectionCase?.status !== "in_call"
      ) {
        throw new Error("Call is not authorized or eligible");
      }
      const session = object(call.sessionData);
      const lease = str(session.leaseExpiresAt);
      if (lease && new Date(lease).getTime() < Date.now())
        throw new Error("Call reservation expired");
      if (!lease && Date.now() - call.startedAt.getTime() > 90_000)
        throw new Error("Call reservation expired");
      return toVoiceCall(call);
    },

    async bindProviderSession(callId, providerSessionId) {
      const updated = await db.callSession.updateMany({
        where: {
          id: callId,
          providerSessionId: null,
          endedAt: null,
          connectionState: "pending",
        },
        data: { providerSessionId, connectionState: "connecting" },
      });
      if (updated.count !== 1) throw new Error("Call provider binding conflict");
    },

    async markConnected(callId) {
      await db.callSession.updateMany({
        where: { id: callId, endedAt: null },
        data: { connectionState: "connected" },
      });
    },

    async markClosing(callId) {
      await db.callSession.updateMany({
        where: { id: callId, endedAt: null },
        data: { connectionState: "closing" },
      });
    },

    async appendTranscript(piece: TranscriptPiece): Promise<boolean> {
      return lockedCall(piece.callId, async (tx) => {
        const call = await tx.callSession.findUnique({ where: { id: piece.callId } });
        if (!call || call.endedAt) return false;
        const session = object(call.sessionData);
        const previous = array(session.transcriptEventKeys).filter(
          (key): key is string => typeof key === "string"
        );
        const keys = piece.eventKey.split("|");
        if (keys.some((key) => previous.includes(key))) return false;
        const line = `[${piece.speaker} ${piece.startMs}-${piece.endMs}ms] ${piece.text}\n`;
        await tx.callSession.update({
          where: { id: piece.callId },
          data: {
            transcriptText: call.transcriptText + line,
            sessionData: { ...session, transcriptEventKeys: [...previous, ...keys] } as never,
          },
        });
        return true;
      });
    },

    async loadCaseContext(callId): Promise<CaseContext> {
      const call = await db.callSession.findUnique({ where: { id: callId } });
      if (!call || call.endedAt || call.activeCaseId !== call.caseId) {
        throw new Error("Call context is unavailable");
      }
      const [collectionCase, member] = await Promise.all([
        db.collectionCase.findFirst({
          where: { id: call.caseId, organizationId: call.organizationId },
        }),
        db.member.findFirst({
          where: { organizationId: call.organizationId, userId: call.actorUserId },
        }),
      ]);
      if (
        !collectionCase ||
        collectionCase.status !== "in_call" ||
        !member ||
        !["admin", "agent"].includes(member.role)
      )
        throw new Error("Case is unavailable");
      const data = object(collectionCase.caseData);
      return {
        customerName: collectionCase.customerName,
        customerType: str(data.customerType) ?? "unspecified",
        invoiceNumber: collectionCase.invoiceNumber,
        invoiceDate: str(data.invoiceDate) ?? "not provided",
        outstandingAmount: collectionCase.outstandingAmount.toString(),
        originalAmount: str(data.originalAmount) ?? collectionCase.outstandingAmount.toString(),
        currency: collectionCase.currency,
        serviceDescription: str(data.serviceDescription) ?? "not provided",
        serviceDate: str(data.serviceDate) ?? "not provided",
        priorContactSummary:
          array(data.timeline)
            .map((item) => str(object(item).summary) ?? str(object(item).note) ?? "")
            .filter(Boolean)
            .slice(-8)
            .join("; ") || "none",
        existingArrangement: data.activeArrangement ?? null,
        policyMarkdown: call.policySnapshot,
      };
    },

    async getFunctionResult(callId, functionCallId) {
      const call = await db.callSession.findUnique({
        where: { id: callId },
        select: { apiResults: true },
      });
      const item = array(call?.apiResults)
        .map(object)
        .find((entry) => entry.functionCallId === functionCallId);
      return str(item?.result);
    },

    async saveFunctionResult(callId, functionCallId, result) {
      await lockedCall(callId, async (tx) => {
        const call = await tx.callSession.findUnique({ where: { id: callId } });
        if (!call) throw new Error("Call is unavailable");
        const previous = array(call.apiResults);
        if (previous.some((entry) => object(entry).functionCallId === functionCallId)) return;
        await tx.callSession.update({
          where: { id: callId },
          data: {
            apiResults: [...previous, { functionCallId, result }] as never,
          },
        });
      });
    },

    async getCallForEnd(callId, actorUserId) {
      const call = await db.callSession.findFirst({ where: { id: callId, actorUserId } });
      if (!call) return null;
      const member = await db.member.findFirst({
        where: {
          organizationId: call.organizationId,
          userId: actorUserId,
        },
      });
      return member && ["admin", "agent"].includes(member.role) ? toVoiceCall(call) : null;
    },

    async listUnfinishedCalls() {
      const calls = await db.callSession.findMany({
        where: {
          endedAt: null,
          OR: [
            { connectionState: { in: ["connecting", "connected", "closing"] } },
            { connectionState: "pending", startedAt: { lt: new Date(Date.now() - 90_000) } },
          ],
        },
      });
      return Promise.all(calls.map(toVoiceCall));
    },

    async finishCall(callId: string, reason: FinishReason): Promise<EndVoiceResult> {
      return lockedCall(callId, async (tx) => {
        const call = await tx.callSession.findUnique({ where: { id: callId } });
        if (!call) throw new Error("Call is unavailable");
        if (call.endedAt)
          return { callId, outcome: call.outcomeKind ?? "incomplete", connectionState: "closed" };
        const session = object(call.sessionData);
        const outcome =
          call.outcomeKind ??
          (reason === "explicit"
            ? "no_outcome"
            : reason === "startup_failed"
              ? "failed"
              : "incomplete");
        await tx.callSession.update({
          where: { id: callId },
          data: {
            outcomeKind: outcome,
            outcomeData: call.outcomeData ?? ({ reason } as never),
            connectionState: "closed",
            activeCaseId: null,
            endedAt: new Date(),
          },
        });
        if (!call.outcomeKind) {
          const prior = str(session.priorCaseStatus) ?? "ready";
          await tx.collectionCase.updateMany({
            where: {
              id: call.caseId,
              organizationId: call.organizationId,
              status: "in_call",
            },
            data: { status: prior },
          });
        }
        return { callId, outcome, connectionState: "closed" };
      });
    },
  };
}
