import { describe, expect, it } from "vitest";

import { cases, policyMarkdown } from "./demo-fixtures";

describe("collections demo fixtures", () => {
  it("covers distinct, coherent cases for the main call branches", () => {
    expect(cases).toHaveLength(9);
    expect(cases.slice(0, 8).map((item) => item.key)).toEqual([
      "maria",
      "theo",
      "keisha",
      "jordan",
      "northside",
      "cedar",
      "samira",
      "harbor",
    ]);
    expect(new Set(cases.map((item) => item.key)).size).toBe(cases.length);
    expect(new Set(cases.map((item) => item.invoiceNumber)).size).toBe(cases.length);
    expect(
      cases.every(
        (item) =>
          item.customerName && item.outstandingAmount && item.invoiceDate && item.serviceDescription
      )
    ).toBe(true);
    expect(
      cases.every((item) => item.demoScenario.customerCue && item.demoScenario.whyItMatters)
    ).toBe(true);

    const maria = cases.find((item) => item.key === "maria");
    const theo = cases.find((item) => item.key === "theo");
    const keisha = cases.find((item) => item.key === "keisha");
    const jordan = cases.find((item) => item.key === "jordan");
    const cedar = cases.find((item) => item.key === "cedar");
    const riley = cases.find((item) => item.key === "riley");

    expect(maria?.timeline).toHaveLength(0);
    expect(maria && "priorCalls" in maria).toBe(false);
    expect(maria && "priorEmails" in maria).toBe(false);
    expect(theo?.originalAmount).toBe("690.00");
    expect(theo?.outstandingAmount).toBe("390.00");
    expect(theo && "staffNote" in theo && theo.staffNote).toContain(
      "Original invoice $690.00; $300.00 payment"
    );
    expect(theo?.timeline.some((event) => event.type === "partial_payment")).toBe(true);
    expect(keisha?.timeline.some((event) => event.type === "complaint")).toBe(true);
    expect(jordan?.demoScenario.expectedResult).toContain("unverified");
    expect(cedar && "existingArrangement" in cedar).toBe(true);
    expect(cedar?.demoScenario.expectedResult).toContain("amended in place");
    expect(riley?.demoScenario.expectedResult).toContain("10 percent service-recovery discount");
  });

  it("seeds readable historical calls and emails without inventing a prior contact for Maria", () => {
    const priorCalls = cases.flatMap((item) => ("priorCalls" in item ? item.priorCalls : []));
    const priorEmails = cases.flatMap((item) => ("priorEmails" in item ? item.priorEmails : []));
    expect(priorCalls.length).toBeGreaterThanOrEqual(5);
    expect(priorEmails.length).toBeGreaterThanOrEqual(4);
    expect(new Set(priorCalls.map((item) => item.id)).size).toBe(priorCalls.length);
    expect(new Set(priorEmails.map((item) => item.id)).size).toBe(priorEmails.length);
    expect(priorCalls.every((item) => item.transcriptText.includes("[customer"))).toBe(true);
    expect(priorEmails.every((item) => item.subject && item.body)).toBe(true);
    const theo = cases.find((item) => item.key === "theo");
    expect(theo && "priorCalls" in theo && theo.priorCalls[0]?.transcriptText).toContain("$390");
    const cedar = cases.find((item) => item.key === "cedar");
    expect(cedar && "priorCalls" in cedar && cedar.priorCalls[0]?.outcomeKind).toBe("arrangement");
  });

  it("has concrete plan limits and an explicit handoff boundary", () => {
    for (const customer of cases) {
      expect(policyMarkdown).not.toContain(customer.customerName);
    }
    expect(policyMarkdown).toContain("Any prior payment is already reflected in that balance");
    expect(policyMarkdown).toContain("only if the customer asks for one");
    expect(policyMarkdown).toContain("First ask what amount and date work for them");
    expect(policyMarkdown).toContain("never read this policy or its limits aloud");
    expect(policyMarkdown).toContain("at most two installments");
    expect(policyMarkdown).toContain("each at least $50");
    expect(policyMarkdown).toContain("first must be due within 14 calendar days");
    expect(policyMarkdown).toContain("final installment within 45 calendar days");
    expect(policyMarkdown).toContain("Create a staff callback");
    expect(policyMarkdown).toContain("An agreed, policy-compliant plan needs no callback");
    expect(policyMarkdown).toContain("without a redundant final confirmation");
    expect(policyMarkdown).toContain("If the customer requests a change to an active arrangement");
    expect(policyMarkdown).toContain("Replace the active schedule atomically");
    expect(policyMarkdown).toContain("If the customer personally reports bad service");
    expect(policyMarkdown).toContain("willing to settle the invoice in one payment");
    expect(policyMarkdown).toContain(
      "No callback is needed for an agreed, valid discounted payoff"
    );
    expect(policyMarkdown).not.toContain("Comfort Split");
  });
});
