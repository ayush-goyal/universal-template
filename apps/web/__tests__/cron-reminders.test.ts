import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/cron/reminders/route";

const { dbMock, sendReminderEmail } = vi.hoisted(() => ({
  dbMock: {
    reminder: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  sendReminderEmail: vi.fn(),
}));

vi.mock("@acme/db", () => ({
  db: dbMock,
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

vi.mock("@acme/auth", () => ({
  sendReminderEmail,
}));

const baseReminder = (id: string) => ({
  id,
  taskId: "t1",
  userId: "u1",
  remindAt: new Date(Date.now() - 60_000),
  sent: false,
  task: {
    id: "t1",
    title: "Buy milk",
    dueAt: null,
    dueHasTime: false,
    projectId: null,
  },
  user: { email: "u@example.com" },
});

const ORIGINAL_RESEND_KEY = process.env.RESEND_API_KEY;
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
  process.env.RESEND_API_KEY = ORIGINAL_RESEND_KEY;
});

afterEach(() => {
  process.env.RESEND_API_KEY = ORIGINAL_RESEND_KEY;
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

describe("/api/cron/reminders", () => {
  it("dry-runs when the Resend key looks like a placeholder", async () => {
    process.env.RESEND_API_KEY = "re_123";
    dbMock.reminder.findMany.mockResolvedValueOnce([baseReminder("r1"), baseReminder("r2")]);
    dbMock.reminder.update.mockResolvedValue({});

    const res = await GET(new Request("http://localhost/api/cron/reminders"));
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      considered: 2,
      sent: 0,
      skipped: 2,
      failed: 0,
      dryRun: true,
    });
    expect(sendReminderEmail).not.toHaveBeenCalled();
    // Still marked sent in DB so they don't fire again.
    expect(dbMock.reminder.update).toHaveBeenCalledTimes(2);
  });

  it("dry-runs when ?dryRun=1 is passed even if Resend is configured", async () => {
    process.env.RESEND_API_KEY = "re_real_key_AbCd1234";
    dbMock.reminder.findMany.mockResolvedValueOnce([baseReminder("r3")]);
    dbMock.reminder.update.mockResolvedValue({});

    const res = await GET(new Request("http://localhost/api/cron/reminders?dryRun=1"));
    const body = await res.json();
    expect(body.dryRun).toBe(true);
    expect(sendReminderEmail).not.toHaveBeenCalled();
  });

  it("sends emails when Resend is configured for real", async () => {
    process.env.RESEND_API_KEY = "re_real_key_AbCd1234";
    dbMock.reminder.findMany.mockResolvedValueOnce([baseReminder("r4")]);
    dbMock.reminder.update.mockResolvedValue({});
    sendReminderEmail.mockResolvedValueOnce({ id: "msg-1" });

    const res = await GET(new Request("http://localhost/api/cron/reminders"));
    const body = await res.json();

    expect(body).toMatchObject({
      ok: true,
      considered: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
      dryRun: false,
    });
    expect(sendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "u@example.com",
        taskTitle: "Buy milk",
      })
    );
    expect(dbMock.reminder.update).toHaveBeenCalledTimes(1);
  });

  it("does NOT dry-run when RESEND_API_KEY is simply missing (misconfig should fail loudly)", async () => {
    delete process.env.RESEND_API_KEY;
    dbMock.reminder.findMany.mockResolvedValueOnce([baseReminder("r-missing")]);
    dbMock.reminder.update.mockResolvedValue({});
    sendReminderEmail.mockRejectedValueOnce(new Error("Missing API key"));

    const res = await GET(new Request("http://localhost/api/cron/reminders"));
    const body = await res.json();

    // dryRun is false → real attempt was made → Resend rejected → counted as failed.
    expect(body.dryRun).toBe(false);
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
    expect(sendReminderEmail).toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is set and the bearer is missing", async () => {
    process.env.CRON_SECRET = "shh";
    const res = await GET(new Request("http://localhost/api/cron/reminders"));
    expect(res.status).toBe(401);
    expect(dbMock.reminder.findMany).not.toHaveBeenCalled();
  });

  it("authorizes when the bearer matches CRON_SECRET", async () => {
    process.env.CRON_SECRET = "shh";
    process.env.RESEND_API_KEY = "re_123";
    dbMock.reminder.findMany.mockResolvedValueOnce([]);
    const res = await GET(
      new Request("http://localhost/api/cron/reminders", {
        headers: { authorization: "Bearer shh" },
      })
    );
    expect(res.status).toBe(200);
  });
});
