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
    expect(config.backendInstructions).toContain("do not add a service-satisfaction check");
    expect(config.backendInstructions).toContain("disputeConfirmationQuote");
    expect(config.backendInstructions).toContain("do not default to an equal split");
    expect(config.backendInstructions).toContain("for the tool only; never speak either");
    expect(config.backendInstructions).toContain("payment_claim");
    expect(config.backendInstructions).toContain("work_quality_dispute");
    expect(config.backendInstructions).toContain("explicit confirmation quote");
    expect(config.backendInstructions).toContain(context.policyMarkdown);
    expect(config.instructions).not.toContain(context.policyMarkdown);
  });

  it("does not invent a callback number", () => {
    const config = initialLiveConfig("Summit Climate Services", context, null);
    expect(config.instructions).toContain("no callback number is configured");
  });
});
