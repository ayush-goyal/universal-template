import { db } from "@acme/db";

import type { InvokeOutcome, OutcomeKind } from "../voice/types";
import type { Checked } from "./decision";
import { verifyAndBuildOutcome } from "./decision";
import { array, object, string } from "./utils";
import { createOpenAIOutcomeVerifier } from "./verifier";

function provisionalEmail(kind: OutcomeKind, customer: string, invoice: string, checked: Checked) {
  const greeting = `Hello ${customer},`;
  if (kind === "arrangement") {
    const schedule = array(checked.data.schedule)
      .map((row) => {
        const item = object(row);
        return `- ${string(item.dueDate, 10)}: ${string(item.amount, 20)}`;
      })
      .join("\n");
    return {
      subject: `Arrangement for invoice ${invoice}`,
      body: `${greeting}\n\nWe recorded the payment schedule you confirmed for invoice ${invoice}:\n${schedule}\n\nThis arrangement is a promise to pay. It does not mean payment has been received.\n\nPlease contact our office if any detail is incorrect.`,
    };
  }
  if (kind === "payment_claim")
    return {
      subject: `Payment claim received for invoice ${invoice}`,
      body: `${greeting}\n\nWe recorded your statement about a payment for invoice ${invoice}. Our team will review it and follow up. This message does not confirm that payment was received or applied.`,
    };
  return {
    subject: `Service concern received for invoice ${invoice}`,
    body: `${greeting}\n\nWe recorded your service concern about invoice ${invoice}. Our team will review it and follow up.`,
  };
}

/** Owns the sole business commit. Retries and duplicate provider actions return the stored outcome. */
export function createPrismaOutcome(apiKey: string): InvokeOutcome {
  const verify = createOpenAIOutcomeVerifier(apiKey);
  return async (input) => {
    const where = {
      id: input.callId,
      organizationId: input.organizationId,
      caseId: input.caseId,
      actorUserId: input.actorUserId,
    };
    const snapshot = await db.callSession.findFirst({ where });
    if (
      !snapshot ||
      snapshot.endedAt ||
      snapshot.connectionState !== "connected" ||
      snapshot.activeCaseId !== input.caseId
    )
      return {
        status: "rejected",
        spokenMessage: "The call is no longer active. Please ask staff for help.",
      };
    if (snapshot.outcomeKind)
      return { status: "already_committed", spokenMessage: "The outcome is already recorded." };
    const member = await db.member.findFirst({
      where: { organizationId: input.organizationId, userId: input.actorUserId },
    });
    if (!member || !["admin", "agent"].includes(member.role))
      return { status: "rejected", spokenMessage: "This caller is not authorized for the case." };
    const caseSnapshot = await db.collectionCase.findFirst({
      where: { id: input.caseId, organizationId: input.organizationId },
    });
    if (!caseSnapshot || caseSnapshot.status !== "in_call")
      return { status: "rejected", spokenMessage: "The case is not open for this call." };
    const today = new Date().toISOString().slice(0, 10);
    const checked = await verifyAndBuildOutcome(
      input.kind,
      input.details,
      snapshot.policySnapshot,
      caseSnapshot.outstandingAmount.toString(),
      object(caseSnapshot.caseData).activeArrangement,
      snapshot.transcriptText,
      verify,
      today
    );
    if (typeof checked === "string") return { status: "rejected", spokenMessage: checked };
    return commitVerifiedOutcome(input, snapshot, caseSnapshot, checked, today);
  };
}

type OutcomeInput = Parameters<InvokeOutcome>[0];
type CallSnapshot = NonNullable<Awaited<ReturnType<typeof db.callSession.findFirst>>>;
type CaseSnapshot = NonNullable<Awaited<ReturnType<typeof db.collectionCase.findFirst>>>;

/** Recheck the verified snapshot under locks, then persist all related records atomically. */
function commitVerifiedOutcome(
  input: OutcomeInput,
  snapshot: CallSnapshot,
  caseSnapshot: CaseSnapshot,
  checked: Checked,
  today: string
): ReturnType<InvokeOutcome> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM call_sessions WHERE id = ${input.callId} FOR UPDATE`;
    const call = await tx.callSession.findFirst({
      where: {
        id: input.callId,
        organizationId: input.organizationId,
        caseId: input.caseId,
        actorUserId: input.actorUserId,
      },
    });
    if (
      !call ||
      call.endedAt ||
      call.activeCaseId !== input.caseId ||
      call.connectionState !== "connected"
    ) {
      return {
        status: "rejected",
        spokenMessage: "The call is no longer active. Please ask staff for help.",
      };
    }
    if (call.outcomeKind) {
      return { status: "already_committed", spokenMessage: "The outcome is already recorded." };
    }
    const member = await tx.member.findFirst({
      where: {
        organizationId: call.organizationId,
        userId: call.actorUserId,
      },
    });
    if (!member || !["admin", "agent"].includes(member.role)) {
      return { status: "rejected", spokenMessage: "This caller is not authorized for the case." };
    }
    await tx.$queryRaw`SELECT id FROM collection_cases WHERE id = ${input.caseId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
    const collectionCase = await tx.collectionCase.findFirst({
      where: {
        id: input.caseId,
        organizationId: input.organizationId,
      },
    });
    if (!collectionCase || collectionCase.status !== "in_call") {
      return { status: "rejected", spokenMessage: "The case is not open for this call." };
    }
    const caseData = object(collectionCase.caseData);
    if (
      call.policySnapshot !== snapshot.policySnapshot ||
      call.transcriptText !== snapshot.transcriptText ||
      collectionCase.outstandingAmount.toString() !== caseSnapshot.outstandingAmount.toString() ||
      JSON.stringify(caseData.activeArrangement) !==
        JSON.stringify(object(caseSnapshot.caseData).activeArrangement) ||
      new Date().toISOString().slice(0, 10) !== today
    )
      return {
        status: "rejected",
        spokenMessage: "The call changed during verification. Please try again.",
      };

    const eventKey = `${input.callId}:${input.kind}:customer-followup`;
    const outcomeData = {
      ...checked.data,
      eventKey,
      actionKey: `${input.callId}:${input.functionCallId}`,
    };
    const caseUpdate: Record<string, unknown> = { ...caseData };
    if (input.kind === "arrangement" || input.kind === "discounted_payoff") {
      caseUpdate.activeArrangement = {
        type: input.kind,
        schedule: checked.data.schedule,
        ...(input.kind === "discounted_payoff"
          ? {
              originalBalance: checked.data.originalBalance,
              discountAmount: checked.data.discountAmount,
              payoffAmount: checked.data.payoffAmount,
            }
          : {}),
        callId: input.callId,
        recordedAt: new Date().toISOString(),
      };
    }
    if (input.kind === "arrangement_amended") {
      const previous = caseData.activeArrangement;
      const history = array(caseData.arrangementHistory);
      caseUpdate.arrangementHistory = [
        ...history,
        {
          arrangement: previous,
          replacedAt: new Date().toISOString(),
          replacedByCallId: input.callId,
        },
      ];
      caseUpdate.activeArrangement = {
        type: "arrangement",
        status: "active",
        schedule: checked.data.schedule,
        callId: input.callId,
        amendedAt: new Date().toISOString(),
      };
    }
    const followUp = checked.staffReason
      ? {
          key: `${input.callId}:${checked.staffReason}`,
          reason: checked.staffReason,
          status: "open",
          description: string(input.details.details, 2_000),
          context: string(input.details.details, 2_000),
          transcriptContext: call.transcriptText.slice(-4_000),
          createdAt: new Date().toISOString(),
        }
      : collectionCase.followUp;
    await tx.callSession.update({
      where: { id: call.id },
      data: {
        outcomeKind: input.kind,
        outcomeData: outcomeData as never,
        summary: checked.summary,
      },
    });
    await tx.collectionCase.update({
      where: { id: collectionCase.id },
      data: {
        status: checked.status,
        caseData: caseUpdate as never,
        ...(checked.staffReason ? { followUp: followUp as never } : {}),
      },
    });
    await tx.caseTimelineEvent.create({
      data: {
        id: `${input.callId}:${input.kind}`,
        organizationId: input.organizationId,
        caseId: input.caseId,
        type: "call_outcome",
        summary: checked.summary,
        occurredAt: new Date(),
      },
    });
    const recipient = string(collectionCase.billingEmail, 320);
    if (
      input.kind !== "escalation" &&
      input.kind !== "discounted_payoff" &&
      input.kind !== "arrangement_amended" &&
      input.kind !== "plan_check_in" &&
      recipient &&
      !collectionCase.doNotEmail
    ) {
      const contact =
        string(collectionCase.authorizedContactName, 160) || collectionCase.customerName;
      const draft = provisionalEmail(input.kind, contact, collectionCase.invoiceNumber, checked);
      await tx.emailMessage.create({
        data: {
          organizationId: call.organizationId,
          caseId: call.caseId,
          callId: call.id,
          eventKey,
          recipient,
          fromAddress: "",
          subject: draft.subject,
          body: draft.body,
          status: "pending_review",
        },
      });
    }
    return {
      status: "committed",
      spokenMessage:
        input.kind === "arrangement"
          ? "The confirmed arrangement is recorded. This is a payment promise, not a received payment."
          : input.kind === "arrangement_amended"
            ? "The amended payment arrangement is recorded. The previous schedule was replaced, and no payment was recorded."
            : input.kind === "plan_check_in"
              ? "The plan check-in is recorded. The existing schedule and balance remain unchanged."
              : input.kind === "discounted_payoff"
                ? "The discounted one-payment promise is recorded. No payment was received yet, and the balance changes only after payment is applied."
                : "I have recorded this for staff follow-up. A person will review and call back.",
    };
  });
}
