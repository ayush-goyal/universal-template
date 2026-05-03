import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();

vi.mock("@acme/db", () => ({
  db: {
    subscription: {
      findFirst: findFirstMock,
    },
  },
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

// Re-import after mocks are registered.
const { FREE_LIMITS, PRO_LIMITS, getLimits, getUserPlan, hasUnlimited } =
  await import("../../../auth/src/entitlements");

describe("entitlements", () => {
  beforeEach(() => findFirstMock.mockReset());

  it("returns free when no active subscription", async () => {
    findFirstMock.mockResolvedValue(null);
    expect(await getUserPlan("user-1")).toBe("free");
  });

  it("returns pro when an active sub exists", async () => {
    findFirstMock.mockResolvedValue({
      id: "s1",
      plan: "pro",
      referenceId: "user-1",
      status: "active",
    } as never);
    expect(await getUserPlan("user-1")).toBe("pro");
  });

  it("hasUnlimited recognises -1", () => {
    expect(hasUnlimited(-1)).toBe(true);
    expect(hasUnlimited(5)).toBe(false);
  });

  it("free vs pro limits", () => {
    expect(FREE_LIMITS.projects).toBeGreaterThan(0);
    expect(PRO_LIMITS.projects).toBe(-1);
    expect(PRO_LIMITS.ai).toBe(1);
    expect(FREE_LIMITS.tasksPerProject).toBe(50);
    expect(FREE_LIMITS.ai).toBe(0);
    expect(FREE_LIMITS.reminders).toBe(0);
    expect(PRO_LIMITS.reminders).toBe(1);
  });

  it("getLimits returns FREE_LIMITS for free plan", async () => {
    findFirstMock.mockResolvedValue(null);
    const limits = await getLimits("user-1");
    expect(limits).toEqual(FREE_LIMITS);
  });

  it("getLimits returns PRO_LIMITS for pro plan", async () => {
    findFirstMock.mockResolvedValue({
      id: "s1",
      plan: "pro",
      referenceId: "user-1",
      status: "active",
    } as never);
    const limits = await getLimits("user-1");
    expect(limits).toEqual(PRO_LIMITS);
  });

  it("getUserPlan returns pro for trialing subscriptions too", async () => {
    findFirstMock.mockResolvedValue({
      id: "s1",
      plan: "pro",
      referenceId: "user-1",
      status: "trialing",
    } as never);
    expect(await getUserPlan("user-1")).toBe("pro");
  });

  it("getUserPlan returns free for canceled subscriptions", async () => {
    findFirstMock.mockResolvedValue(null);
    expect(await getUserPlan("user-1")).toBe("free");
    // Verify the where clause filters by active/trialing only.
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          referenceId: "user-1",
          plan: "pro",
          status: { in: ["active", "trialing"] },
        }),
      })
    );
  });
});
