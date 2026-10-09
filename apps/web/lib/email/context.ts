import "server-only";

import { db } from "@acme/db";

import { buildEmailFacts } from "./draft";

export type EmailMessageIdentity = {
  id: string;
  organizationId: string;
  caseId: string;
  callId: string | null;
  eventKey: string;
  recipient: string;
};

export async function loadEmailContext(message: EmailMessageIdentity) {
  if (!message.callId) throw new Error("Email is not linked to a completed call.");
  const [call, collectionCase, settings] = await Promise.all([
    db.callSession.findFirst({
      where: {
        id: message.callId,
        organizationId: message.organizationId,
        caseId: message.caseId,
      },
    }),
    db.collectionCase.findFirst({
      where: { id: message.caseId, organizationId: message.organizationId },
    }),
    db.companySettings.findUnique({ where: { organizationId: message.organizationId } }),
  ]);
  if (!call || !collectionCase || !settings || !call.endedAt) {
    throw new Error("Email outcome context is incomplete.");
  }
  if (
    call.outcomeKind !== "arrangement" &&
    call.outcomeKind !== "payment_claim" &&
    call.outcomeKind !== "work_quality_dispute"
  ) {
    throw new Error("This call outcome does not permit customer email.");
  }
  if (message.eventKey !== `${call.id}:${call.outcomeKind}:customer-followup`) {
    throw new Error("Email event key does not match its outcome.");
  }
  const facts = buildEmailFacts(call, collectionCase, settings.displayName);
  if (message.recipient.toLowerCase() !== facts.recipient) {
    throw new Error("Email recipient does not match the authorized billing address.");
  }
  return { call, collectionCase, settings, facts };
}
