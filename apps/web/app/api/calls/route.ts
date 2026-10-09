import { z } from "zod";

import { db, Prisma } from "@acme/db";

import { authorizationResponse, requireCaseAccess, requireSameOrigin } from "@/lib/authorization";
import { callHonoInternal } from "@/lib/hono-service";

export const runtime = "nodejs";

const startSchema = z.object({
  caseId: z.uuid(),
  sdpOffer: z.string().min(20).max(250_000),
});

type CreatedCall = {
  id: string;
  organizationId: string;
  caseId: string;
  actorUserId: string;
};

async function releaseFailedStart(call: CreatedCall) {
  await db.$transaction(async (tx) => {
    const current = await tx.callSession.findUnique({ where: { id: call.id } });
    if (!current || ["closed", "failed"].includes(current.connectionState) || current.outcomeKind)
      return;
    const prior =
      current.sessionData &&
      typeof current.sessionData === "object" &&
      !Array.isArray(current.sessionData) &&
      "priorCaseStatus" in current.sessionData &&
      typeof current.sessionData.priorCaseStatus === "string"
        ? current.sessionData.priorCaseStatus
        : "ready";
    await tx.callSession.update({
      where: { id: call.id },
      data: { connectionState: "failed", activeCaseId: null, endedAt: new Date() },
    });
    await tx.collectionCase.update({ where: { id: call.caseId }, data: { status: prior } });
  });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = startSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "A case and WebRTC offer are required." }, { status: 400 });
    }

    const { caseId, sdpOffer } = parsed.data;
    const actor = await requireCaseAccess(request.headers, caseId);
    const startKey = request.headers.get("idempotency-key")?.trim() || null;
    if (startKey && (startKey.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(startKey))) {
      return Response.json({ error: "Invalid idempotency key." }, { status: 400 });
    }

    if (startKey) {
      const previous = await db.callSession.findUnique({
        where: {
          organizationId_startIdempotencyKey: {
            organizationId: actor.organizationId,
            startIdempotencyKey: startKey,
          },
        },
      });
      if (previous) {
        const data = previous.sessionData;
        const answer =
          data && typeof data === "object" && !Array.isArray(data) && "sdpAnswer" in data
            ? data.sdpAnswer
            : null;
        if (
          previous.actorUserId === actor.userId &&
          previous.caseId === caseId &&
          typeof answer === "string"
        ) {
          return Response.json({
            callId: previous.id,
            sdpAnswer: answer,
            connectionState: previous.connectionState,
          });
        }
        return Response.json({ error: "This call start is already in progress." }, { status: 409 });
      }
    }

    let call: CreatedCall;
    try {
      call = await db.$transaction(async (tx) => {
        const collectionCase = await tx.collectionCase.findUnique({ where: { id: caseId } });
        if (!collectionCase || collectionCase.organizationId !== actor.organizationId) {
          throw new Error("case_not_found");
        }
        if (!["ready", "arrangement_recorded"].includes(collectionCase.status)) {
          throw new Error("case_not_ready");
        }
        if (collectionCase.doNotCall) {
          throw new Error("calling_disabled");
        }
        const settings = await tx.companySettings.findUnique({
          where: { organizationId: actor.organizationId },
        });
        if (!settings || !settings.policyVersion || !settings.policyMarkdown.trim()) {
          throw new Error("policy_not_published");
        }
        const created = await tx.callSession.create({
          data: {
            organizationId: actor.organizationId,
            caseId,
            actorUserId: actor.userId,
            policyVersion: settings.policyVersion,
            policySnapshot: settings.policyMarkdown,
            activeCaseId: caseId,
            startIdempotencyKey: startKey,
            connectionState: "pending",
            sessionData: { priorCaseStatus: collectionCase.status },
          },
        });
        await tx.collectionCase.update({ where: { id: caseId }, data: { status: "in_call" } });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return Response.json({ error: "A call is already active for this case." }, { status: 409 });
      }
      if (error instanceof Error) {
        if (error.message === "case_not_found") {
          return Response.json({ error: "Case not found." }, { status: 404 });
        }
        if (error.message === "case_not_ready") {
          return Response.json({ error: "This case is not ready for a call." }, { status: 409 });
        }
        if (error.message === "calling_disabled") {
          return Response.json({ error: "Calling is disabled for this case." }, { status: 409 });
        }
        if (error.message === "policy_not_published") {
          return Response.json(
            { error: "Publish company policy before calling." },
            { status: 409 }
          );
        }
      }
      throw error;
    }

    try {
      const response = await callHonoInternal("/internal/voice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: call.id,
          caseId: call.caseId,
          actorUserId: call.actorUserId,
          sdpOffer,
        }),
      });
      if (!response.ok) throw new Error("voice_service_failed");
      const result = (await response.json()) as { callId?: string; sdpAnswer?: string };
      if (result.callId !== call.id || !result.sdpAnswer) throw new Error("invalid_voice_response");
      await db.$transaction(async (tx) => {
        const latest = await tx.callSession.findUnique({ where: { id: call.id } });
        const sessionData =
          latest?.sessionData &&
          typeof latest.sessionData === "object" &&
          !Array.isArray(latest.sessionData)
            ? latest.sessionData
            : {};
        await tx.callSession.update({
          where: { id: call.id },
          data: {
            connectionState: latest?.connectionState === "pending" ? "connecting" : undefined,
            sessionData: { ...sessionData, sdpAnswer: result.sdpAnswer },
          },
        });
      });
      return Response.json(
        { callId: call.id, sdpAnswer: result.sdpAnswer, connectionState: "connecting" },
        { status: 201 }
      );
    } catch {
      await releaseFailedStart(call);
      return Response.json({ error: "Could not start the voice session." }, { status: 502 });
    }
  } catch (error) {
    return authorizationResponse(error);
  }
}
