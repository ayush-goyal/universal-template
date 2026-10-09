import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPrismaOutcome } from "./persistence";

const mocks = vi.hoisted(() => {
  const verify = vi.fn();
  const tx = {
    $queryRaw: vi.fn(async () => []),
    callSession: { findFirst: vi.fn(), update: vi.fn(async () => ({})) },
    collectionCase: { findFirst: vi.fn(), update: vi.fn(async (_args: unknown) => ({})) },
    member: { findFirst: vi.fn(async () => ({ role: "agent" })) },
    caseTimelineEvent: { create: vi.fn(async () => ({})) },
    emailMessage: { create: vi.fn(async () => ({})) },
  };
  const db = {
    callSession: { findFirst: vi.fn() },
    member: { findFirst: vi.fn() },
    collectionCase: { findFirst: vi.fn() },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
  };
  return { verify, tx, db };
});
vi.mock("@acme/db", () => ({ db: mocks.db }));
vi.mock("./verifier", () => ({ createOpenAIOutcomeVerifier: () => mocks.verify }));

const input = {
  callId: "call-1",
  organizationId: "org-1",
  caseId: "case-1",
  actorUserId: "user-1",
  functionCallId: "tool-1",
  kind: "payment_claim" as const,
  details: { details: "Customer says they paid by transfer." },
};
const call = {
  id: "call-1",
  organizationId: "org-1",
  caseId: "case-1",
  actorUserId: "user-1",
  activeCaseId: "case-1",
  endedAt: null,
  connectionState: "connected",
  outcomeKind: null,
  policySnapshot: "Claims of payment need reconciliation.",
  transcriptText: "[customer 0-1000ms] I paid by transfer yesterday.\n",
};
const collectionCase = {
  id: "case-1",
  status: "in_call",
  outstandingAmount: "100.00",
  caseData: {},
  followUp: null,
  billingEmail: null,
};
const existingPlan = {
  status: "active",
  installments: [
    { dueDate: "2026-10-23", amount: "455.00" },
    { dueDate: "2026-11-06", amount: "455.00" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.callSession.findFirst.mockResolvedValue(call);
  mocks.db.member.findFirst.mockResolvedValue({ role: "agent" });
  mocks.db.collectionCase.findFirst.mockResolvedValue(collectionCase);
  mocks.tx.callSession.findFirst.mockResolvedValue(call);
  mocks.tx.collectionCase.findFirst.mockResolvedValue(collectionCase);
  mocks.verify.mockResolvedValue({ approved: true, reason: "" });
});

describe("outcome commit boundary", () => {
  it("does not send an unauthorized case to the model", async () => {
    mocks.db.member.findFirst.mockResolvedValue(null);
    expect((await createPrismaOutcome("test-key")(input)).status).toBe("rejected");
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("does not start a transaction when verification rejects", async () => {
    mocks.verify.mockResolvedValue({ approved: false, reason: "No current payment claim." });
    expect(await createPrismaOutcome("test-key")(input)).toEqual({
      status: "rejected",
      spokenMessage: "No current payment claim.",
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a changed transcript under the lock without writing", async () => {
    mocks.tx.callSession.findFirst.mockResolvedValue({
      ...call,
      transcriptText: call.transcriptText + "[customer 1000-2000ms] Actually, I haven't paid.\n",
    });
    expect((await createPrismaOutcome("test-key")(input)).status).toBe("rejected");
    expect(mocks.tx.callSession.update).not.toHaveBeenCalled();
    expect(mocks.tx.collectionCase.update).not.toHaveBeenCalled();
  });

  it("writes the verified outcome and follow-up in one transaction", async () => {
    expect((await createPrismaOutcome("test-key")(input)).status).toBe("committed");
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.callSession.update).toHaveBeenCalledTimes(1);
    expect(mocks.tx.collectionCase.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "paused_for_review" }) })
    );
    expect(mocks.tx.caseTimelineEvent.create).toHaveBeenCalledTimes(1);
  });

  it("records a discounted payoff without reducing the balance or creating follow-up", async () => {
    const discountCase = {
      ...collectionCase,
      outstandingAmount: "900.00",
      billingEmail: "riley@example.com",
    };
    mocks.db.collectionCase.findFirst.mockResolvedValue(discountCase);
    mocks.tx.collectionCase.findFirst.mockResolvedValue(discountCase);
    const result = await createPrismaOutcome("test-key")({
      ...input,
      kind: "discounted_payoff",
      details: {
        details: "Customer accepted a service-recovery payoff.",
        schedule: [{ dueDate: new Date().toISOString().slice(0, 10), amount: "810.00" }],
      },
    });
    expect(result.status).toBe("committed");
    expect(result.spokenMessage).toContain("No payment was received yet");
    expect(mocks.tx.collectionCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "arrangement_recorded",
          caseData: expect.objectContaining({
            activeArrangement: expect.objectContaining({
              type: "discounted_payoff",
              payoffAmount: "810.00",
            }),
          }),
        }),
      })
    );
    expect(mocks.tx.emailMessage.create).not.toHaveBeenCalled();
    const update = mocks.tx.collectionCase.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(update.data).not.toHaveProperty("outstandingAmount");
    expect(update.data).not.toHaveProperty("followUp");
  });

  it("records an active-plan check-in without replacing the schedule or adding follow-up", async () => {
    const activeCase = {
      ...collectionCase,
      outstandingAmount: "910.00",
      caseData: { activeArrangement: existingPlan },
    };
    mocks.db.collectionCase.findFirst.mockResolvedValue(activeCase);
    mocks.tx.collectionCase.findFirst.mockResolvedValue(activeCase);
    const result = await createPrismaOutcome("test-key")({
      ...input,
      kind: "plan_check_in",
      details: { details: "Customer says the existing plan remains on track." },
    });
    expect(result.status).toBe("committed");
    expect(mocks.tx.collectionCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "arrangement_recorded",
          caseData: { activeArrangement: existingPlan },
        }),
      })
    );
    expect(mocks.tx.emailMessage.create).not.toHaveBeenCalled();
    const update = mocks.tx.collectionCase.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(update.data).not.toHaveProperty("followUp");
    expect(update.data).not.toHaveProperty("outstandingAmount");
  });

  it("atomically replaces an active plan and retains the old schedule", async () => {
    const activeCase = {
      ...collectionCase,
      outstandingAmount: "910.00",
      caseData: { activeArrangement: existingPlan },
    };
    mocks.db.collectionCase.findFirst.mockResolvedValue(activeCase);
    mocks.tx.collectionCase.findFirst.mockResolvedValue(activeCase);
    const replacement = [
      { dueDate: "2026-10-23", amount: "455.00" },
      { dueDate: "2026-11-20", amount: "455.00" },
    ];
    const result = await createPrismaOutcome("test-key")({
      ...input,
      kind: "arrangement_amended",
      details: { details: "Customer confirmed the amended schedule.", schedule: replacement },
    });
    expect(result.status).toBe("committed");
    expect(mocks.tx.collectionCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "arrangement_recorded",
          caseData: expect.objectContaining({
            activeArrangement: expect.objectContaining({ schedule: replacement }),
            arrangementHistory: [expect.objectContaining({ arrangement: existingPlan })],
          }),
        }),
      })
    );
    expect(mocks.tx.emailMessage.create).not.toHaveBeenCalled();
  });
});
