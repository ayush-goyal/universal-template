import { describe, expect, it, vi } from "vitest";

vi.mock("@acme/db", () => ({
  db: {},
}));

vi.mock("better-auth", () => ({
  betterAuth: vi.fn((config: any) => ({
    _config: config,
    api: { getSession: vi.fn() },
  })),
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => ({})),
}));

vi.mock("better-auth/plugins", () => ({
  phoneNumber: vi.fn((opts: any) => ({ id: "phone-number", ...opts })),
}));

vi.mock("@better-auth/expo", () => ({
  expo: vi.fn(() => ({ id: "expo" })),
}));

vi.mock("@better-auth/stripe", () => ({
  stripe: vi.fn((opts: any) => ({ id: "stripe", ...opts })),
}));

vi.mock("stripe", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: vi.fn() } })),
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => null),
}));

vi.mock("@react-email/components", () => ({
  render: vi.fn().mockResolvedValue(""),
}));

vi.mock("../emails/email-verification-email", () => ({
  default: vi.fn(() => null),
}));

vi.mock("../emails/password-reset-email", () => ({
  default: vi.fn(() => null),
}));

describe("@acme/auth", () => {
  it("exports auth instance", async () => {
    const { auth } = await import("../index");
    expect(auth).toBeDefined();
    expect(auth).toHaveProperty("api");
  });

  it("auth was configured with betterAuth", async () => {
    const { betterAuth } = await import("better-auth");
    await import("../index");
    expect(betterAuth).toHaveBeenCalledTimes(1);
  });
});

describe("email utilities", () => {
  it("exports sendPasswordResetEmail", async () => {
    const { sendPasswordResetEmail } = await import("../email");
    expect(typeof sendPasswordResetEmail).toBe("function");
  });

  it("exports sendVerificationEmail", async () => {
    const { sendVerificationEmail } = await import("../email");
    expect(typeof sendVerificationEmail).toBe("function");
  });
});

describe("twilio", () => {
  it("exports sendOTP function", async () => {
    const { sendOTP } = await import("../twilio");
    expect(typeof sendOTP).toBe("function");
  });

  it("logs to console in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendOTP } = await import("../twilio");
    await sendOTP("+1234567890", "123456");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[DEV] Sending OTP to",
      "+1234567890",
      "with code",
      "123456"
    );

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});

describe("stripe", () => {
  it("exports stripe client and plans", async () => {
    const { stripe, stripePlans } = await import("../stripe");
    expect(stripe).toBeDefined();
    expect(Array.isArray(stripePlans)).toBe(true);
  });
});
