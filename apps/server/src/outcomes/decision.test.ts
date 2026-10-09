import { describe, expect, it, vi } from "vitest";

import type { OutcomeVerifier } from "./verifier";
import { policyMarkdown } from "../../../../packages/db/prisma/demo-fixtures";
import { verifyAndBuildOutcome } from "./decision";

const approve: OutcomeVerifier = vi.fn(async () => ({ approved: true, reason: "" }));
const deny: OutcomeVerifier = vi.fn(async () => ({
  approved: false,
  reason: "Policy does not allow this schedule.",
}));
const today = "2026-10-09";

function dispute(transcript: string, verify = approve) {
  return verifyAndBuildOutcome(
    "work_quality_dispute",
    { details: "Customer requests service review." },
    policyMarkdown,
    "1140.00",
    null,
    transcript,
    verify,
    today
  );
}

function arrangement(
  schedule: { dueDate: string; amount: string }[],
  verify = approve,
  policy = policyMarkdown
) {
  return verifyAndBuildOutcome(
    "arrangement",
    {
      details: "Customer agrees to a full-balance plan.",
      schedule,
    },
    policy,
    "1280.00",
    null,
    "[assistant 0-1000ms] Two $640 payments on October 23 and November 22?\n[customer 1000-2000ms] Yes, those dates and amounts work.\n",
    verify,
    today
  );
}

const goodSchedule = [
  { dueDate: "2026-10-23", amount: "640.00" },
  { dueDate: "2026-11-22", amount: "640.00" },
];
const existingPlan = {
  status: "active",
  installments: [
    { dueDate: "2026-10-23", amount: "455.00" },
    { dueDate: "2026-11-06", amount: "455.00" },
  ],
};

describe("outcome verification", () => {
  it("asks the verifier to distinguish assistant speech from customer confirmation", async () => {
    const result = await dispute(
      "[customer 0-1000ms] Can I pay monthly?\n[assistant 1000-2000ms] The note says the AC still leaks.\n",
      deny
    );
    expect(result).toBe("Policy does not allow this schedule.");
  });

  it("uses the verifier for the meaning of current customer speech", async () => {
    const quote = "Wait, when did I say the AC still leaks?";
    expect(await dispute(`[customer 0-1000ms] ${quote}\n`, deny)).toBe(
      "Policy does not allow this schedule."
    );
    const accepted = await dispute(
      "[customer 0-1000ms] Yes, the AC still leaks. Please review it.\n"
    );
    expect(typeof accepted).toBe("object");
    if (typeof accepted !== "string") expect(accepted.status).toBe("paused_for_review");
  });

  it("accepts a verified plan under policy wording that is not regex shaped", async () => {
    const policy =
      "Customers may split the balance in two payments of $50 or more. Start within a fortnight and finish within 45 days.";
    const verifier = vi.fn<OutcomeVerifier>(async () => ({ approved: true, reason: "" }));
    const result = await arrangement(goodSchedule, verifier, policy);
    expect(typeof result).toBe("object");
    expect(verifier).toHaveBeenCalledWith(
      expect.objectContaining({ policy, today, kind: "arrangement" })
    );
    if (typeof result !== "string") expect(result.status).toBe("arrangement_recorded");
  });

  it("sends proposed plan arithmetic to the LLM instead of using a policy parser", async () => {
    expect(await arrangement(goodSchedule, deny)).toBe("Policy does not allow this schedule.");
    const verifier = vi.fn<OutcomeVerifier>(async () => ({
      approved: false,
      reason: "Installments do not cover the balance.",
    }));
    expect(await arrangement([{ dueDate: "2026-10-23", amount: "640.00" }], verifier)).toBe(
      "Installments do not cover the balance."
    );
    expect(verifier).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "arrangement", outstanding: "1280.00" })
    );
  });

  it("requires model support for payment claims and escalation", async () => {
    for (const kind of ["payment_claim", "escalation"] as const) {
      expect(
        await verifyAndBuildOutcome(
          kind,
          { details: "Customer requested follow-up." },
          policyMarkdown,
          "100.00",
          null,
          "",
          deny,
          today
        )
      ).toBe("Policy does not allow this schedule.");
    }
  });

  it("checks in on an existing plan without changing the balance or schedule", async () => {
    const verifier = vi.fn<OutcomeVerifier>(async () => ({ approved: true, reason: "" }));
    const result = await verifyAndBuildOutcome(
      "plan_check_in",
      { details: "Customer says the October 23 payment remains on track." },
      policyMarkdown,
      "910.00",
      existingPlan,
      "[customer 0-1000ms] Yes, I am still on track for the October 23 payment.\n",
      verifier,
      today
    );
    expect(result).toMatchObject({
      status: "arrangement_recorded",
      data: { paymentReceivedVerified: false },
    });
    expect(verifier).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "plan_check_in", existingArrangement: existingPlan })
    );
    expect(
      await verifyAndBuildOutcome(
        "plan_check_in",
        { details: "Customer says the plan works." },
        policyMarkdown,
        "910.00",
        null,
        "",
        verifier,
        today
      )
    ).toContain("no active arrangement");
  });

  it("lets the LLM verify a complete replacement schedule for an existing plan", async () => {
    const verifier = vi.fn<OutcomeVerifier>(async () => ({ approved: true, reason: "" }));
    const replacement = [
      { dueDate: "2026-10-23", amount: "455.00" },
      { dueDate: "2026-11-20", amount: "455.00" },
    ];
    const result = await verifyAndBuildOutcome(
      "arrangement_amended",
      {
        details: "Customer requested moving the second payment to November 20.",
        schedule: replacement,
      },
      policyMarkdown,
      "910.00",
      existingPlan,
      "[customer 0-1000ms] Can you move my second payment to November 20?\n[assistant 1000-2000ms] $455 on October 23 and $455 on November 20?\n[customer 2000-3000ms] Yes, I agree to those dates and amounts.\n",
      verifier,
      today
    );
    expect(result).toMatchObject({
      status: "arrangement_recorded",
      data: { schedule: replacement, previousArrangement: existingPlan, customerAgreed: true },
    });
    expect(verifier).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "arrangement_amended",
        existingArrangement: existingPlan,
        outstanding: "910.00",
      })
    );
    expect(
      await verifyAndBuildOutcome(
        "arrangement_amended",
        { details: "Customer requested a plan change.", schedule: replacement },
        policyMarkdown,
        "910.00",
        null,
        "",
        verifier,
        today
      )
    ).toContain("no active arrangement");
  });

  it("records a verified one-payment service recovery promise without treating it as payment", async () => {
    const verifier = vi.fn<OutcomeVerifier>(async () => ({ approved: true, reason: "" }));
    const result = await verifyAndBuildOutcome(
      "discounted_payoff",
      {
        details: "Customer was unhappy with the repair and accepted the one-payment offer.",
        schedule: [{ dueDate: "2026-10-23", amount: "810.00" }],
      },
      policyMarkdown,
      "900.00",
      null,
      "[customer 0-1000ms] The service was awful, but I can pay it in one go if you discount it.\n[assistant 1000-2000ms] That's $810 due October 23.\n[customer 2000-3000ms] Yes, I agree to pay $810 on October 23.\n",
      verifier,
      today
    );
    expect(verifier).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "discounted_payoff", outstanding: "900.00" })
    );
    expect(result).toMatchObject({
      status: "arrangement_recorded",
      data: {
        discountAmount: "90.00",
        payoffAmount: "810.00",
        paymentReceived: false,
      },
    });
  });

  it("asks the LLM to check discounted amount and deadline", async () => {
    const verifier = vi.fn<OutcomeVerifier>(async () => ({
      approved: false,
      reason: "The proposed discount does not fit the pinned policy.",
    }));
    const attempt = (schedule: { dueDate: string; amount: string }[]) =>
      verifyAndBuildOutcome(
        "discounted_payoff",
        { details: "Customer accepted a discounted payoff.", schedule },
        policyMarkdown,
        "900.00",
        null,
        "",
        verifier,
        today
      );
    expect(await attempt([{ dueDate: "2026-10-23", amount: "800.00" }])).toBe(
      "The proposed discount does not fit the pinned policy."
    );
    expect(
      await attempt([
        { dueDate: "2026-10-16", amount: "405.00" },
        { dueDate: "2026-10-23", amount: "405.00" },
      ])
    ).toContain("exactly one payment");
    expect(await attempt([{ dueDate: "2026-10-24", amount: "810.00" }])).toBe(
      "The proposed discount does not fit the pinned policy."
    );
    expect(verifier).toHaveBeenCalledTimes(2);
  });

  it("does not record a discounted payoff when the LLM finds no current qualifying complaint", async () => {
    const result = await verifyAndBuildOutcome(
      "discounted_payoff",
      {
        details: "Customer wants a discount.",
        schedule: [{ dueDate: "2026-10-23", amount: "810.00" }],
      },
      policyMarkdown,
      "900.00",
      null,
      "[customer 0-1000ms] Can I get ten percent off?\n",
      deny,
      today
    );
    expect(result).toBe("Policy does not allow this schedule.");
  });

  it("derives the accepted discount amount for display and blocks a second commitment", async () => {
    const details = {
      details: "Customer accepted a discounted one-payment settlement.",
      schedule: [{ dueDate: "2026-10-23", amount: "90.04" }],
    };
    const result = await verifyAndBuildOutcome(
      "discounted_payoff",
      details,
      policyMarkdown,
      "100.05",
      null,
      "[customer 0-1000ms] I accept the discounted payoff.\n",
      approve,
      today
    );
    expect(result).toMatchObject({
      data: { discountAmount: "10.01", payoffAmount: "90.04" },
    });
    expect(
      await verifyAndBuildOutcome(
        "discounted_payoff",
        details,
        policyMarkdown,
        "100.05",
        { status: "active" },
        "",
        approve,
        today
      )
    ).toContain("already exists");
  });
});
