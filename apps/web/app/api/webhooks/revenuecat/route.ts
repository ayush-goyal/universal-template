import { z } from "zod";

import { db } from "@acme/db";

import { env } from "@/env";
import { refreshRevenueCatProEntitlement } from "@/lib/revenuecat";

const RevenueCatWebhookSchema = z.object({
  event: z
    .object({
      app_user_id: z.string().min(1).max(256).optional(),
      original_app_user_id: z.string().min(1).max(256).optional(),
      aliases: z.array(z.string().min(1).max(256)).max(100).optional(),
      transferred_from: z.array(z.string().min(1).max(256)).max(100).optional(),
      transferred_to: z.array(z.string().min(1).max(256)).max(100).optional(),
    })
    .loose(),
});

export async function POST(request: Request) {
  if (!env.REVENUECAT_WEBHOOK_AUTH) {
    return Response.json({ error: "RevenueCat webhook is not configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== env.REVENUECAT_WEBHOOK_AUTH) {
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
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ].filter((value): value is string => Boolean(value));

  const users = await db.user.findMany({
    where: {
      id: {
        in: [...new Set(candidateUserIds)],
      },
    },
    select: {
      id: true,
    },
  });

  // Transfers affect both accounts; fetch their current access from RevenueCat.
  for (const user of users) {
    await refreshRevenueCatProEntitlement(user.id);
  }
  return Response.json({ received: true });
}
