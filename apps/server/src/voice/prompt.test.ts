import { describe, expect, it } from "vitest";

import type { CaseContext } from "./types";
import { initialLiveConfig } from "./prompt";

const context: CaseContext = {
  customerName: "Theo Ramirez",
  customerType: "residential",
  invoiceNumber: "DEMO-2026-0805-TR",
  invoiceDate: "2026-08-05",
  outstandingAmount: "390.00",
  originalAmount: "690.00",
  currency: "USD",
  serviceDescription: "Duct repair",
  serviceDate: "2026-08-03",
  priorContactSummary: "Prior $300 payment recorded; $390 remains outstanding.",
  existingArrangement: null,
  policyMarkdown: "A payment arrangement may have at most two installments.",
};

describe("initialLiveConfig", () => {
  it("gives the voice model readable case facts and separate call rules", () => {
    const config = initialLiveConfig("Summit Climate Services", context, null);

    expect(config.instructions).toContain("disclose that you are an AI assistant");
    expect(config.instructions).toContain("\n\nCase facts");
    expect(config.instructions).toContain('"outstandingAmount":"390.00"');
    expect(config.instructions).toContain('"originalAmount":"690.00"');
    expect(config.instructions).not.toContain(context.invoiceNumber);
    expect(config.instructions).toContain("Do not say or spell the invoice number");
    expect(config.backendInstructions).toContain(context.invoiceNumber);
    expect(config.instructions).toContain("Prior $300 payment recorded");
    expect(config.instructions).not.toContain("verify your identity");
    expect(config.instructions).toContain("Do not ask whether the service was good");
    expect(config.instructions).toContain("How would you like to handle this balance?");
    expect(config.instructions).toContain("Do not propose or mention a payment plan");
    expect(config.instructions).toContain("First ask what payment amount and date would work");
    expect(config.instructions).toContain("about 15 percent faster");
    expect(config.instructions).toContain("Prior-contact notes are historical context");
    expect(config.instructions).toContain("closest workable full-balance schedule");
    expect(config.instructions).toContain("never recite or quote policy text");
    expect(config.instructions).toContain("If no allowed schedule is workable");
    expect(config.instructions).toContain("10 percent service-recovery discount");
    expect(config.instructions).toContain("Do not bring up service quality or a discount first");
    expect(config.backendInstructions).toContain("do not add a service-satisfaction check");
    expect(config.backendInstructions).toContain("do not default to an equal split");
    expect(config.backendInstructions).toContain(
      "independently checks the transcript and pinned policy"
    );
    expect(config.backendInstructions).toContain("payment_claim");
    expect(config.backendInstructions).toContain("work_quality_dispute");
    expect(config.backendInstructions).toContain("For discounted_payoff");
    expect(config.backendInstructions).toContain("submit it proactively without a final read-back");
    expect(config.backendInstructions).toContain(context.policyMarkdown);
    expect(config.instructions).not.toContain(context.policyMarkdown);
  });

  it("does not invent a callback number", () => {
    const config = initialLiveConfig("Summit Climate Services", context, null);
    expect(config.instructions).toContain("no callback number is configured");
  });

  it("opens an active-plan call as a scheduled-payment check-in", () => {
    const config = initialLiveConfig(
      "Summit Climate Services",
      {
        ...context,
        customerName: "Cedar Bakery LLC",
        outstandingAmount: "910.00",
        existingArrangement: {
          status: "active",
          installments: [
            { dueDate: "2026-10-23", amount: "455.00" },
            { dueDate: "2026-11-06", amount: "455.00" },
          ],
        },
      },
      null
    );
    expect(config.instructions).toContain("This account already has an active payment arrangement");
    expect(config.instructions).toContain("455.00 on 2026-10-23");
    expect(config.instructions).toContain("whether the next scheduled payment has been sent");
    expect(config.instructions).toContain("Do not ask for an extra final confirmation");
    expect(config.instructions).not.toContain("This account has no active payment arrangement");
    expect(config.backendInstructions).toContain("For plan_check_in");
    expect(config.backendInstructions).toContain("For arrangement_amended");
  });
});
