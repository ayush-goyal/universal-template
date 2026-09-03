import { describe, expect, it, vi } from "vitest";

const { prismaPg } = vi.hoisted(() => ({ prismaPg: vi.fn() }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: prismaPg }));

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    $disconnect: vi.fn(),
  },
}));
vi.mock("../../prisma/generated/client/client", () => ({
  PrismaClient: vi.fn(function PrismaClient() {
    return mockClient;
  }),
}));

vi.stubEnv("DATABASE_URL", "postgresql://node.test/database");

const { db } = await import("../client.node");

describe("@acme/db Node client", () => {
  it("creates and exports the shared database client", () => {
    expect(db).toBe(mockClient);
    expect(prismaPg).toHaveBeenCalledWith({
      connectionString: "postgresql://node.test/database",
    });
  });
});
