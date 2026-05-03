import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# Acme Tasks

> A modern, soft Todoist-style to-do list app. Built on Next.js 16 (App Router), tRPC, Prisma + Postgres, Better Auth (with Stripe), the Vercel AI SDK, and Tailwind v4 + shadcn/ui.

## What it does

Capture, organize, and finish work in one calm app:

- **Inbox + smart views** — Inbox, Today (overdue + scheduled), Upcoming (next 7 days), Completed, Search.
- **Projects with sub-projects, sections, and a List/Board (kanban) toggle**.
- **Tasks** with priority, due date + time, recurrence, labels, comments, subtasks, reminders.
- **Drag-and-drop reorder** for tasks (inbox + project list + board) and projects (sidebar).
- **Quick add** anywhere with the \`Q\` shortcut. Natural-language parsing for project / label / priority / date / recurrence.
- **AI features (Pro):** Plan my day, Daily summary, Generate project from a goal, AI quick-add parse.
- **Reminders** — calendar + time picker; email dispatch via a cron route.
- **Pricing** — Free vs Pro (\\$4/mo or \\$36/yr) via Stripe + Better Auth's Stripe plugin.
- **Soft sage palette** with light + dark themes.

## Architecture

- \`apps/web\` — Next.js 16 frontend + tRPC + cron route.
- \`packages/api\` — tRPC routers: projects, sections, labels, tasks, comments, reminders, search, subscription, ai.
- \`packages/auth\` — Better Auth + Stripe + entitlements.
- \`packages/db\` — Prisma schema (Project, Section, Task, Label, TaskLabel, Comment, Reminder).

## Routes

- \`/\` — marketing landing.
- \`/pricing\` — plan cards + Stripe checkout.
- \`/sign-in\`, \`/sign-up\`, \`/forgot-password\`, \`/reset-password\`.
- \`/app/inbox\`, \`/app/today\`, \`/app/upcoming\`, \`/app/completed\`, \`/app/search\`.
- \`/app/projects/[id]\` — list/board toggle.
- \`/app/projects/new\` — AI project generator.
- \`/app/labels/[id]\`.
- \`/app/settings\` — Profile / Appearance / Notifications / Billing / Data.
- \`/app/billing\` — manage / cancel / resume.
- \`/app/archived\` — restore archived projects.
- \`/api/cron/reminders\` — emits email reminders (CRON_SECRET-protected).
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
