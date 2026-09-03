import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# Universal Template Web App

> A Next.js 16 web application with App Router, Tailwind CSS v4, and shadcn/ui. Part of a full-stack TypeScript monorepo with a React Native mobile app and portable Hono example server, featuring end-to-end type safety via tRPC.

This web application is built with Next.js 16 and features modern React patterns with App Router, server components, and full-stack type safety. It integrates with a shared API layer and authentication system, supporting features like user management, payments via Stripe, analytics through PostHog, and error tracking with Sentry.`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
