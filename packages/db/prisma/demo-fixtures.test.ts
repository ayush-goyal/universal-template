import { describe, expect, it } from "vitest";

import { cases, policyMarkdown } from "./demo-fixtures";

describe("collections demo fixtures", () => {
  it("covers distinct, coherent cases for the main call branches", () => {
    expect(cases).toHaveLength(8);
    expect(new Set(cases.map((item) => item.key)).size).toBe(cases.length);
    expect(new Set(cases.map((item) => item.invoiceNumber)).size).toBe(cases.length);
    expect(
      cases.every((item) => item.demoScenario.customerCue && item.demoScenario.whyItMatters)
    ).toBe(true);

    const maria = cases.find((item) => item.key === "maria");
    const theo = cases.find((item) => item.key === "theo");
    const keisha = cases.find((item) => item.key === "keisha");
    const jordan = cases.find((item) => item.key === "jordan");
    const cedar = cases.find((item) => item.key === "cedar");

    expect(maria?.timeline).toHaveLength(0);
    expect(theo?.originalAmount).toBe("690.00");
    expect(theo?.outstandingAmount).toBe("390.00");
    expect(theo?.timeline.some((event) => event.type === "partial_payment")).toBe(true);
    expect(keisha?.timeline.some((event) => event.type === "complaint")).toBe(true);
    expect(jordan?.demoScenario.expectedResult).toContain("unverified");
    expect(cedar && "existingArrangement" in cedar).toBe(true);
  });

  it("has concrete plan limits and an explicit handoff boundary", () => {
    expect(policyMarkdown).toContain("only if the customer asks for one");
    expect(policyMarkdown).toContain("First ask what amount and date work for them");
    expect(policyMarkdown).toContain("never read this policy or its limits aloud");
    expect(policyMarkdown).toContain("at most two installments");
    expect(policyMarkdown).toContain("each at least $50");
    expect(policyMarkdown).toContain("first must be due within 14 calendar days");
    expect(policyMarkdown).toContain("final installment within 45 calendar days");
    expect(policyMarkdown).toContain("callback task");
    expect(policyMarkdown).toContain("A confirmed, policy-compliant plan needs no callback");
    expect(policyMarkdown).not.toContain("Comfort Split");
  });
});
