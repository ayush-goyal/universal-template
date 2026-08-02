import type { Entitlement, PlanLimits } from "@acme/shared";
import { db } from "@acme/db";

import { resolveEntitlement } from "./entitlement";

/** Limits that are counted over a rolling window rather than checked against a current total. */
export type MeteredFeature = "aiMessagesPerDay";

export interface UsageStatus {
  feature: MeteredFeature;
  used: number;
  /** `null` means unlimited on the current plan. */
  limit: number | null;
  remaining: number | null;
  /** When the counter resets; `null` when unlimited. */
  resetsAt: Date | null;
}

/** Midnight UTC of the day containing `at`. Counters are keyed by this. */
export function usagePeriodStart(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

function nextPeriodStart(periodStart: Date): Date {
  return new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
}

function limitFor(limits: PlanLimits, feature: MeteredFeature): number | null {
  return limits[feature];
}

/** Read the current window's usage without changing it. */
export async function getUsage(
  userId: string,
  feature: MeteredFeature,
  entitlement?: Entitlement
): Promise<UsageStatus> {
  const resolved = entitlement ?? (await resolveEntitlement(userId));
  const limit = limitFor(resolved.limits, feature);
  const periodStart = usagePeriodStart();

  if (limit === null) {
    return { feature, used: 0, limit: null, remaining: null, resetsAt: null };
  }

  const record = await db.usageRecord.findUnique({
    where: { userId_feature_periodStart: { userId, feature, periodStart } },
  });
  const used = record?.count ?? 0;

  return {
    feature,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: nextPeriodStart(periodStart),
  };
}

export class UsageLimitExceededError extends Error {
  constructor(readonly status: UsageStatus) {
    super(
      `Daily limit reached for ${status.feature} (${status.used}/${status.limit ?? "unlimited"}).`
    );
    this.name = "UsageLimitExceededError";
  }
}

/**
 * Record one use of a metered feature, throwing {@link UsageLimitExceededError} when the plan's
 * quota is already spent.
 *
 * The increment happens before the work does, and the check is part of the same write: an atomic
 * `upsert` followed by comparing the *resulting* count means two concurrent requests cannot both
 * see the last remaining unit. Callers should treat a throw as "show the paywall", not as an error.
 */
export async function consumeUsage(
  userId: string,
  feature: MeteredFeature,
  entitlement?: Entitlement
): Promise<UsageStatus> {
  const resolved = entitlement ?? (await resolveEntitlement(userId));
  const limit = limitFor(resolved.limits, feature);

  if (limit === null) {
    return { feature, used: 0, limit: null, remaining: null, resetsAt: null };
  }

  const periodStart = usagePeriodStart();
  const record = await db.usageRecord.upsert({
    where: { userId_feature_periodStart: { userId, feature, periodStart } },
    create: { userId, feature, periodStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  const status: UsageStatus = {
    feature,
    used: record.count,
    limit,
    remaining: Math.max(0, limit - record.count),
    resetsAt: nextPeriodStart(periodStart),
  };

  if (record.count > limit) {
    // Give the unit back so a rejected request does not permanently burn quota.
    await db.usageRecord.update({
      where: { userId_feature_periodStart: { userId, feature, periodStart } },
      data: { count: { decrement: 1 } },
    });
    throw new UsageLimitExceededError({ ...status, used: limit, remaining: 0 });
  }

  return status;
}
