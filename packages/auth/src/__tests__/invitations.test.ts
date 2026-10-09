import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@acme/db", () => ({ db: { invitation: { findUnique } } }));

const validInvitation = {
  id: "invitation-1",
  email: "agent@example.com",
  role: "agent",
  status: "pending",
  expiresAt: new Date(Date.now() + 60_000),
};

describe("invitation-only registration", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findUnique.mockResolvedValue(validInvitation);
  });

  it("accepts only the pending invitation's email", async () => {
    const { requireRegistrationInvitation } = await import("../invitations");
    await expect(
      requireRegistrationInvitation("invitation-1", "AGENT@example.com")
    ).resolves.toEqual(validInvitation);
    await expect(
      requireRegistrationInvitation("invitation-1", "other@example.com")
    ).rejects.toThrow("A valid invitation is required.");
  });

  it("rejects absent, expired, and unsupported invitations", async () => {
    const { requireRegistrationInvitation } = await import("../invitations");
    await expect(requireRegistrationInvitation(null, "agent@example.com")).rejects.toThrow();
    for (const override of [
      { status: "accepted" },
      { expiresAt: new Date(Date.now() - 60_000) },
      { role: "owner" },
    ]) {
      findUnique.mockResolvedValueOnce({ ...validInvitation, ...override });
      await expect(
        requireRegistrationInvitation("invitation-1", "agent@example.com")
      ).rejects.toThrow("A valid invitation is required.");
    }
  });
});
