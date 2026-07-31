import type { User } from "@/libs/auth-client";

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-test",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as User;
}
