import { describe, expect, it, vi } from "vitest";

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

vi.mock("../../prisma/generated/client/client", () => {
  const mockClient = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: { count: vi.fn() },
  };
  return { PrismaClient: vi.fn(() => mockClient) };
});

describe("@acme/db", () => {
  it("exports db client", async () => {
    const { db } = await import("../client");
    expect(db).toBeDefined();
    expect(db).toHaveProperty("$connect");
    expect(db).toHaveProperty("$disconnect");
  });

  it("re-exports from generated client", async () => {
    const exports = await import("../index");
    expect(exports).toHaveProperty("db");
  });
});
