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
const { FREE_LIMITS, PRO_LIMITS, getUserPlan, hasUnlimited } =
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
  });
});
