import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { database, sendOTP } = vi.hoisted(() => ({
  database: { user: [], session: [], account: [], verification: [] } as Record<
    "user" | "session" | "account" | "verification",
    Record<string, unknown>[]
  >,
  sendOTP: vi.fn<(phoneNumber: string, code: string) => Promise<void>>(),
}));

vi.mock("@acme/db", () => ({ db: {} }));
vi.mock("better-auth/adapters/prisma", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory");
  return { prismaAdapter: () => memoryAdapter(database) };
});
vi.mock("@better-auth/stripe", () => ({ stripe: () => ({ id: "stripe" }) }));
vi.mock("../stripe", () => ({ stripe: {}, stripePlans: [], stripeWebhookSecret: "" }));
vi.mock("../email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock("../twilio", () => ({ sendOTP }));

let auth: typeof import("../index").auth;

beforeAll(async () => {
  vi.stubEnv("SITE_URL", "http://localhost:9876");
  vi.stubEnv("BETTER_AUTH_SECRET", "audit-only-secret-with-at-least-32-characters");
  ({ auth } = await import("../index"));
});

beforeEach(() => {
  for (const records of Object.values(database)) records.length = 0;
  sendOTP.mockReset();
});

afterAll(() => vi.unstubAllEnvs());

function post(path: string, body: Record<string, unknown>, cookie?: string) {
  return auth.handler(
    new Request(`http://localhost:9876/api/auth/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:9876",
        ...(cookie && { cookie }),
      },
      body: JSON.stringify(body),
    })
  );
}

const credentials = {
  name: "Email user",
  email: "email-user@example.test",
  password: "Audit-Only-Password123!",
};
const phoneNumber = "+15555550123";

async function userFrom(response: Response) {
  const result = z
    .object({
      user: z.object({
        id: z.string(),
        phoneNumber: z.string().nullish(),
        phoneNumberVerified: z.boolean().nullish(),
      }),
    })
    .parse(await response.json());
  return result.user;
}

describe("phone ownership", () => {
  it("prevents email signup from reserving someone else's phone account", async () => {
    const rejected = await post("sign-up/email", { ...credentials, phoneNumber });
    expect(rejected.status).toBe(400);
    expect(database.user).toHaveLength(0);

    const signup = await post("sign-up/email", credentials);
    expect(signup.status).toBe(200);
    const emailUser = await userFrom(signup);

    expect((await post("phone-number/send-otp", { phoneNumber })).status).toBe(200);
    const code = sendOTP.mock.calls[0]?.[1];
    expect(code).toBeDefined();
    const verified = await post("phone-number/verify", { phoneNumber, code });
    expect(verified.status).toBe(200);
    const phoneUser = await userFrom(verified);
    expect(phoneUser.id).not.toBe(emailUser.id);
    expect(phoneUser.phoneNumberVerified).toBe(true);

    const passwordLogin = await post("sign-in/email", credentials);
    expect(passwordLogin.status).toBe(200);
    expect((await userFrom(passwordLogin)).id).toBe(emailUser.id);
  });

  it("requires OTP before linking a phone to an existing email account", async () => {
    const signup = await post("sign-up/email", credentials);
    expect(signup.status).toBe(200);
    const emailUser = await userFrom(signup);
    const cookie = signup.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");

    const update = await post("update-user", { phoneNumber }, cookie);
    expect(update.status).toBe(400);
    expect(database.user[0]?.phoneNumber).toBeFalsy();

    await post("phone-number/send-otp", { phoneNumber });
    const code = sendOTP.mock.calls[0]?.[1];
    expect(code).toBeDefined();
    const verified = await post(
      "phone-number/verify",
      { phoneNumber, code, updatePhoneNumber: true },
      cookie
    );
    expect(verified.status).toBe(200);
    const linkedUser = await userFrom(verified);
    expect(linkedUser.id).toBe(emailUser.id);
    expect(linkedUser.phoneNumber).toBe(phoneNumber);
    expect(linkedUser.phoneNumberVerified).toBe(true);
  });
});
