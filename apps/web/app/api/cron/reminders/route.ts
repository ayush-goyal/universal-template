import { NextResponse } from "next/server";

import { sendReminderEmail } from "@acme/auth";
import { db } from "@acme/db";

/**
 * Reminder dispatcher. Designed to be called by Vercel Cron (or any
 * scheduler) on a regular cadence (e.g. every 5 minutes). Looks up
 * reminders whose `remindAt` is in the past and which haven't been sent,
 * fires off an email each, and marks them sent.
 *
 * Add the secret header `Authorization: Bearer <CRON_SECRET>` to call.
 * In production, configure via vercel.json:
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "every 5 minutes" }] }
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Dry run: mark reminders sent without invoking Resend. Useful in dev
  // (the seeded RESEND_API_KEY="re_123" would otherwise 401) and for
  // smoke-testing the cron pipeline. Trigger via ?dryRun=1.
  const url = new URL(request.url);
  const dryRunParam = url.searchParams.get("dryRun") === "1";
  const resendKey = process.env.RESEND_API_KEY ?? "";
  const looksLikePlaceholder =
    !resendKey || resendKey === "re_123" || resendKey.startsWith("re_dummy");
  const dryRun = dryRunParam || looksLikePlaceholder;

  const now = new Date();
  const due = await db.reminder.findMany({
    where: { sent: false, remindAt: { lte: now } },
    take: 200,
    include: {
      task: { select: { id: true, title: true, dueAt: true, dueHasTime: true, projectId: true } },
      user: { select: { email: true } },
    },
  });

  const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of due) {
    try {
      if (dryRun) {
        skipped++;
      } else {
        await sendReminderEmail({
          to: r.user.email,
          taskTitle: r.task.title,
          taskUrl: r.task.projectId
            ? `${baseUrl}/app/projects/${r.task.projectId}`
            : `${baseUrl}/app/inbox`,
          dueLabel: r.task.dueAt ? new Date(r.task.dueAt).toLocaleString() : undefined,
        });
        sent++;
      }
      await db.reminder.update({
        where: { id: r.id },
        data: { sent: true },
      });
    } catch (err) {
      console.error("[cron/reminders] failed", r.id, err);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    considered: due.length,
    sent,
    failed,
    skipped,
    dryRun,
  });
}
