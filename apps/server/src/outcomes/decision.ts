import type { OutcomeKind } from "../voice/types";
import type { OutcomeVerifier } from "./verifier";
import { array, cents, object, string, validDate } from "./utils";

export type Checked = {
  data: Record<string, unknown>;
  status: string;
  summary: string;
  staffReason?: string;
};

export async function verifyAndBuildOutcome(
  kind: OutcomeKind,
  details: Record<string, unknown>,
  policy: string,
  outstanding: string,
  existingArrangement: unknown,
  transcript: string,
  verify: OutcomeVerifier,
  today = new Date().toISOString().slice(0, 10)
): Promise<Checked | string> {
  const description = string(details.details, 2_000);
  if (!description) return "Please provide a concise reason for the outcome.";

  const schedule: { dueDate: string; amount: string }[] = [];
  if (kind === "arrangement" || kind === "discounted_payoff" || kind === "arrangement_amended") {
    if (kind !== "arrangement_amended" && existingArrangement)
      return "An arrangement already exists. Check it or amend it instead of creating another.";
    if (kind === "arrangement_amended" && !existingArrangement)
      return "There is no active arrangement to amend.";
    const proposed = array(details.schedule);
    if (kind === "discounted_payoff" && proposed.length !== 1)
      return "A discounted payoff requires exactly one payment.";
    if (
      (kind === "arrangement" || kind === "arrangement_amended") &&
      (proposed.length < 1 || proposed.length > 12)
    )
      return "The schedule needs between one and twelve installments.";
    let lastDate = "";
    for (const row of proposed) {
      const item = object(row);
      const dueDate = string(item.dueDate, 10);
      const amount = string(item.amount, 20);
      const amountCents = cents(amount);
      if (!validDate(dueDate) || dueDate <= lastDate || amountCents === null || amountCents <= 0n)
        return "Each installment needs a valid, increasing date and a positive exact amount.";
      lastDate = dueDate;
      schedule.push({ dueDate, amount });
    }
  }
  if (kind === "plan_check_in" && !existingArrangement)
    return "There is no active arrangement to check in on.";
  const verdict = await verify({
    kind,
    details:
      kind === "arrangement" || kind === "discounted_payoff" || kind === "arrangement_amended"
        ? { ...details, schedule }
        : details,
    policy,
    outstanding,
    existingArrangement,
    transcript,
    today,
  });
  if (!verdict.approved) return verdict.reason || "The outcome needs staff review.";

  if (kind === "arrangement") {
    return {
      data: {
        schedule,
        customerAgreed: true,
        description,
      },
      status: "arrangement_recorded",
      summary: `Customer confirmed ${schedule.length} installment arrangement totaling ${outstanding}.`,
    };
  }
  if (kind === "arrangement_amended") {
    return {
      data: {
        schedule,
        previousArrangement: existingArrangement,
        customerAgreed: true,
        description,
      },
      status: "arrangement_recorded",
      summary: `Customer confirmed an amended ${schedule.length}-payment arrangement for the ${outstanding} outstanding balance. The previous schedule was retained in history.`,
    };
  }
  if (kind === "plan_check_in") {
    return {
      data: { description, paymentReceivedVerified: false },
      status: "arrangement_recorded",
      summary:
        "Customer confirmed the existing payment arrangement remains on track; no payment was verified or recorded.",
    };
  }
  if (kind === "discounted_payoff") {
    const balance = cents(outstanding) ?? 0n;
    const amount = cents(schedule[0]?.amount ?? "") ?? 0n;
    const discount = balance - amount;
    const format = (value: bigint) =>
      `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
    return {
      data: {
        schedule,
        originalBalance: outstanding,
        discountAmount: format(discount),
        payoffAmount: schedule[0]?.amount,
        customerAgreed: true,
        paymentReceived: false,
        description,
      },
      status: "arrangement_recorded",
      summary: `Customer confirmed a service-recovery discount and one payment of ${schedule[0]?.amount} due ${schedule[0]?.dueDate}. No payment was received.`,
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
    return {
      data: { description },
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
