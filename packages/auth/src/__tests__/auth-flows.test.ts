import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { database, sendVerificationEmail, sendPasswordResetEmail, sendOTP } = vi.hoisted(() => ({
  database: {
    user: [],
    account: [],
    session: [],
    verification: [],
    subscription: [],
  },
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendOTP: vi.fn(),
}));

vi.mock("@acme/db", () => ({ db: {} }));
vi.mock("better-auth/adapters/prisma", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  return { prismaAdapter: () => memoryAdapter(database) };
});
vi.mock("../email", () => ({ sendVerificationEmail, sendPasswordResetEmail }));
vi.mock("../twilio", () => ({ sendOTP }));

let auth: Awaited<ReturnType<typeof createTestAuth>>;
let requestId = 0;
const origin = "http://localhost:3000";
const account = { name: "Auth test", email: "auth@example.com", password: "test-password-123" };

beforeAll(async () => {
  vi.stubEnv("SITE_URL", origin);
  vi.stubEnv("BETTER_AUTH_SECRET", "auth-flow-test-secret-that-is-long-enough-123456789");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  vi.stubEnv("NODE_ENV", "production");
  auth = await createTestAuth();
});

async function createTestAuth() {
  const { auth: configured } = await import("../index");
  const { betterAuth } = await import("better-auth");
  return betterAuth({
    ...configured.options,
    advanced: {
      ...configured.options.advanced,
      // Better Auth skips origin checks in test runners unless explicitly enabled.
      disableOriginCheck: false,
    },
  });
}

beforeEach(() => {
  for (const rows of Object.values(database)) rows.length = 0;
  sendVerificationEmail.mockReset();
  sendPasswordResetEmail.mockReset();
  sendOTP.mockReset();
});

afterAll(() => vi.unstubAllEnvs());

function post(path: string, body: unknown, headers?: Record<string, string>) {
  return auth.handler(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        cookie: "auth-test=1",
        "x-real-ip": `192.0.2.${++requestId}`,
        ...headers,
      },
      body: JSON.stringify(body),
    })
  );
}

function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

describe("configured auth handler", () => {
  it("keeps immediate sign-in and supports optional email verification", async () => {
    const signup = await post("/sign-up/email", { ...account, callbackURL: "/dashboard" });
    expect(signup.status).toBe(200);
    expect(cookies(signup)).toContain("session_token");
    expect(sendVerificationEmail).not.toHaveBeenCalled();

    const unverified = await post("/sign-in/email", account);
    expect(unverified.status).toBe(200);
    expect(await unverified.json()).toMatchObject({ user: { emailVerified: false } });

    const sent = await post("/send-verification-email", {
      email: account.email,
      callbackURL: "/dashboard",
    });
    expect(sent.status).toBe(200);
    expect(sendVerificationEmail).toHaveBeenCalledOnce();

    const verificationURL = sendVerificationEmail.mock.calls[0]![0].verificationLink as string;
    const verified = await auth.handler(new Request(verificationURL));
    expect(verified.status).toBe(302);
    expect(new URL(verified.headers.get("location")!, origin).pathname).toBe("/dashboard");
    const cookie = cookies(verified);
    expect(cookie).toContain("session_token");
    const getSession = () => auth.api.getSession({ headers: new Headers({ cookie }) });
    expect((await getSession())?.user.emailVerified).toBe(true);
  });

  it("accepts the production native origin and rejects untrusted origins", async () => {
    const body = { phoneNumber: "+16505551234" };
    expect(
      (await post("/phone-number/send-otp", body, { origin: "https://evil.example" })).status
    ).toBe(403);
    expect(sendOTP).not.toHaveBeenCalled();
    const nativeHeaders = { origin: "", "expo-origin": "expoboilerplate://" };
    const sent = await post("/phone-number/send-otp", body, nativeHeaders);
    expect(sent.status).toBe(200);
    const code = sendOTP.mock.calls[0]![1] as string;
    const verified = await post("/phone-number/verify", { ...body, code }, nativeHeaders);
    expect(verified.status).toBe(200);
    expect(cookies(verified)).toContain("session_token");
  });
});
