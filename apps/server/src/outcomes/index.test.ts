import { describe, expect, it, vi } from "vitest";

import { policyMarkdown } from "../../../../packages/db/prisma/demo-fixtures";
import { checkOutcome } from "./index";

vi.mock("@acme/db", () => ({ db: {} }));

describe("work-quality outcomes", () => {
  it("does not pause collection from a historical note repeated by the assistant", () => {
    const result = checkOutcome(
      "work_quality_dispute",
      {
        details: "A prior note says the AC leaked.",
        disputeConfirmationQuote: "the AC still leaks",
      },
      "",
      "1140.00",
      null,
      "[customer 0-1000ms] Can I pay $30 per month?\n[assistant 1000-2000ms] A prior note says the AC still leaks.\n"
    );

    expect(result).toContain("current customer confirmation");
  });

  it("accepts an affirmed current concern from the customer transcript", () => {
    const quote = "Yes, the AC still leaks. Please have someone review it.";
    const result = checkOutcome(
      "work_quality_dispute",
      {
        details: "Customer says the AC still leaks and requests service review.",
        disputeConfirmationQuote: quote,
      },
      "",
      "1140.00",
      null,
      `[assistant 0-200ms] Would you like service review?\n[customer 200-1500ms] ${quote}\n`
    );

    expect(typeof result).toBe("object");
    if (typeof result !== "string") {
      expect(result.status).toBe("paused_for_review");
      expect(result.data.disputeConfirmationQuote).toBe(quote);
    }
  });

  it.each([
    "Wait, when did I say that the AC still leaks?",
    "No, it's fine. Let's discuss the payment plan.",
  ])("rejects a correction instead of treating it as a dispute: %s", (quote) => {
    const result = checkOutcome(
      "work_quality_dispute",
      { details: "Prior case note mentioned a leak.", disputeConfirmationQuote: quote },
      "",
      "1140.00",
      null,
      `[customer 0-1000ms] ${quote}\n`
    );

    expect(result).toContain("current customer confirmation");
  });
});

describe("payment arrangements", () => {
  it("records the confirmed Harbor two-payment plan under the seeded policy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T15:39:00.000Z"));
    try {
      const policyPassage =
        "A payment arrangement may have at most two installments, each at least $50. The first must be due within 14 calendar days of agreement and the final installment within 45 calendar days.";
      const result = checkOutcome(
        "arrangement",
        {
          details: "Customer agreed to pay the $1,280 balance in two $640 installments.",
          schedule: [
            { dueDate: "2026-10-23", amount: "640.00" },
            { dueDate: "2026-11-22", amount: "640.00" },
          ],
          policyPassage,
          policyExplanation:
            "Two installments of at least $50; first in 14 days, final in 44 days; total $1,280.",
          readBackConfirmed: true,
          confirmationQuote: "Yeah, that's fine",
        },
        policyMarkdown,
        "1280.00",
        null,
        "[assistant 0-1000ms] Do you agree to two $640 payments on October 23 and November 22?\n[customer 1000-2000ms] Yeah, that's fine\n"
      );

      expect(typeof result).toBe("object");
      if (typeof result !== "string") {
        expect(result.status).toBe("arrangement_recorded");
        expect(result.staffReason).toBeUndefined();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
