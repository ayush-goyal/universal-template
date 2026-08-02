-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "stripeScheduleId" TEXT,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mobile_subscriptions" (
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "productId" TEXT,
    "entitlementIds" TEXT[],
    "currentPeriodEnd" TIMESTAMP(3),
    "willRenew" BOOLEAN NOT NULL DEFAULT true,
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "lastEventId" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_subscriptions_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("userId","feature","periodStart")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("provider","eventId")
);

-- CreateIndex
CREATE INDEX "subscription_referenceId_idx" ON "subscription"("referenceId");

-- CreateIndex
CREATE INDEX "subscription_stripeCustomerId_idx" ON "subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "subscription_stripeSubscriptionId_idx" ON "subscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "mobile_subscriptions" ADD CONSTRAINT "mobile_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
