import { db } from "@acme/db";

import type { InvokeOutcome, OutcomeKind } from "../voice/types";

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const string = (value: unknown, max = 500): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function cents(value: string): bigint | null {
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function policyNumber(value: string): number | null {
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  return /^\d+$/.test(value) ? Number(value) : (words[value.toLowerCase()] ?? null);
}

/** Only terms we can verify from published prose are eligible for automatic commitment. */
function arrangementLimits(policy: string) {
  const maxMatch = policy.match(/at most\s+(\w+)\s+installments?/i);
  // The amount must stop before sentence punctuation, such as "$50.".
  const minimumMatch = policy.match(
    /each\s+at least\s+\$((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i
  );
  const firstMatch = policy.match(/first\s+must be due within\s+(\d+)\s+calendar days?/i);
  const finalMatch = policy.match(/final\s+installment within\s+(\d+)\s+calendar days?/i);
  const maxCount = maxMatch ? policyNumber(maxMatch[1] ?? "") : null;
  const minimum = minimumMatch ? cents((minimumMatch[1] ?? "").replaceAll(",", "")) : null;
  const firstDays = firstMatch ? Number(firstMatch[1]) : null;
  const finalDays = finalMatch ? Number(finalMatch[1]) : null;
  if (!maxCount || minimum === null || firstDays === null || finalDays === null) return null;
  if (maxCount > 12 || firstDays < 0 || finalDays < firstDays) return null;
  return { maxCount, minimum, firstDays, finalDays };
}

type Checked = {
  data: Record<string, unknown>;
  status: string;
  summary: string;
  staffReason?: string;
};

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

export function checkOutcome(
  kind: OutcomeKind,
  details: Record<string, unknown>,
  policy: string,
  outstanding: string,
  existingArrangement: unknown,
  transcript: string
): Checked | string {
  const description = string(details.details, 2_000);
  if (!description) return "Please provide a concise reason for the outcome.";

  if (kind === "arrangement") {
    if (existingArrangement) return "An arrangement already exists. Escalate for staff review.";
    if (details.readBackConfirmed !== true)
      return "Read back the full schedule and obtain explicit customer confirmation first.";
    const quote = string(details.confirmationQuote, 200);
    const customerSpeech = transcript
      .split("\n")
      .filter((line) => line.startsWith("[customer "))
      .join("\n")
      .toLocaleLowerCase("en-US");
    if (!quote || !customerSpeech.includes(quote.toLocaleLowerCase("en-US"))) {
      return "The customer's explicit confirmation must be present in the saved transcript.";
    }
    const passage = string(details.policyPassage, 2_000);
    const explanation = string(details.policyExplanation, 2_000);
    if (!passage || !policy.includes(passage) || !explanation)
      return "The schedule needs an exact supporting policy passage and self-check.";
    const limits = arrangementLimits(policy);
    if (!limits)
      return "The published arrangement terms need staff review before a plan can be recorded.";
    const proposed = array(details.schedule);
    if (proposed.length < 1 || proposed.length > limits.maxCount)
      return "The schedule has more installments than the policy permits.";
    const schedule: { dueDate: string; amount: string }[] = [];
    let total = 0n;
    let lastDate = "";
    const today = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(`${today}T00:00:00.000Z`).getTime();
    for (const row of proposed) {
      const item = object(row);
      const dueDate = string(item.dueDate, 10);
      const amount = string(item.amount, 20);
      const amountCents = cents(amount);
      if (
        !validDate(dueDate) ||
        dueDate < today ||
        dueDate <= lastDate ||
        amountCents === null ||
        amountCents <= 0n
      ) {
        return "Each installment needs a future, increasing date and a positive exact amount.";
      }
      if (amountCents < limits.minimum) return "An installment is below the policy minimum.";
      const dayOffset = Math.round(
        (new Date(`${dueDate}T00:00:00.000Z`).getTime() - todayMs) / 86_400_000
      );
      if (schedule.length === 0 && dayOffset > limits.firstDays)
        return "The first installment is later than policy allows.";
      if (dayOffset > limits.finalDays) return "The final installment is later than policy allows.";
      lastDate = dueDate;
      total += amountCents;
      schedule.push({ dueDate, amount });
    }
    if (total !== cents(outstanding))
      return "Installments must total the exact outstanding balance.";
    return {
      data: {
        schedule,
        policyPassage: passage,
        policyExplanation: explanation,
        readBackConfirmed: true,
        confirmationQuote: quote,
        description,
      },
      status: "arrangement_recorded",
      summary: `Customer confirmed ${schedule.length} installment arrangement totaling ${outstanding}.`,
    };
  }

  if (kind === "payment_claim") {
    return {
      data: {
        claimedDate: string(details.paymentClaimDate, 10) || null,
        claimedMethod: string(details.paymentMethod, 100) || null,
        claimedReference: string(details.paymentReference, 200) || null,
        description,
        receivedPaymentVerified: false,
      },
      status: "paused_for_review",
      summary: "Customer claims payment; staff reconciliation required. No payment was recorded.",
      staffReason: "payment_reconciliation",
    };
  }

  if (kind === "work_quality_dispute") {
    const quote = string(details.disputeConfirmationQuote, 200);
    const customerSpeech = transcript
      .split("\n")
      .filter((line) => line.startsWith("[customer "))
      .join("\n")
      .toLocaleLowerCase("en-US");
    const deniesOrQuestionsConcern =
      quote.includes("?") ||
      /\b(?:when did i|i never said|i didn't say|it's fine|it is fine|issue is resolved|problem is resolved|don't want (?:a )?review|do not want (?:a )?review)\b/i.test(
        quote
      );
    if (
      !quote ||
      deniesOrQuestionsConcern ||
      !customerSpeech.includes(quote.toLocaleLowerCase("en-US"))
    ) {
      return "A current customer confirmation of the service concern is needed before pausing collection.";
    }
    return {
      data: { description, disputeConfirmationQuote: quote },
      status: "paused_for_review",
      summary: "Customer disputes service quality; collection discussion paused for staff review.",
      staffReason: "service_quality_dispute",
    };
  }

  return {
    data: { description },
    status: "escalated",
    summary: "Call escalated for a staff callback.",
    staffReason: "callback",
  };
}

/** Owns the sole business commit. Retries and duplicate provider actions return the stored outcome. */
export const invokePrismaOutcome: InvokeOutcome = async (input) =>
  db.$transaction(async (tx) => {
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
    const checked = checkOutcome(
      input.kind,
      input.details,
      call.policySnapshot,
      collectionCase.outstandingAmount.toString(),
      caseData.activeArrangement,
      call.transcriptText
    );
    if (typeof checked === "string") return { status: "rejected", spokenMessage: checked };

    const eventKey = `${input.callId}:${input.kind}:customer-followup`;
    const outcomeData = {
      ...checked.data,
      eventKey,
      actionKey: `${input.callId}:${input.functionCallId}`,
    };
    const timeline = array(caseData.timeline).slice(-99);
    const caseUpdate: Record<string, unknown> = {
      ...caseData,
      timeline: [
        ...timeline,
        {
          id: `${input.callId}:${input.kind}`,
          type: "call_outcome",
          occurredAt: new Date().toISOString(),
          summary: checked.summary,
        },
      ],
    };
    if (input.kind === "arrangement") {
      caseUpdate.activeArrangement = {
        schedule: checked.data.schedule,
        callId: input.callId,
        recordedAt: new Date().toISOString(),
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
    const recipient = string(caseData.billingEmail, 320);
    if (input.kind !== "escalation" && recipient && caseData.doNotEmail !== true) {
      const contact = string(caseData.authorizedContactName, 160) || collectionCase.customerName;
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
          : "I have recorded this for staff follow-up. A person will review and call back.",
    };
  });
