import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { db } from "@acme/db";

import { env } from "@/env";
import { refreshRevenueCatProEntitlement } from "@/lib/revenuecat";

export const runtime = "nodejs";

const RevenueCatWebhookSchema = z.object({
  event: z
    .object({
      app_user_id: z.string().min(1),
      original_app_user_id: z.string().optional(),
      aliases: z.array(z.string()).optional(),
    })
    .loose(),
});

export async function POST(request: Request) {
  if (!env.REVENUECAT_WEBHOOK_AUTH) {
    return Response.json({ error: "RevenueCat webhook is not configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const actual = authorization ? Buffer.from(authorization) : null;
  const expected = Buffer.from(env.REVENUECAT_WEBHOOK_AUTH);
  if (!actual || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = RevenueCatWebhookSchema.safeParse(payload);
  if (!result.success) {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const event = result.data.event;
  const candidateUserIds = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ].filter((value): value is string => Boolean(value));

  const user = await db.user.findFirst({
    where: {
      id: {
        in: [...new Set(candidateUserIds)],
      },
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return Response.json({ received: true });
  }

  await refreshRevenueCatProEntitlement(user.id);
  return Response.json({ received: true });
}
