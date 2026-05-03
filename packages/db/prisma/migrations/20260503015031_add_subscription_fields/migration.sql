-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "stripeScheduleId" TEXT,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'incomplete',
ALTER COLUMN "cancelAtPeriodEnd" SET DEFAULT false;
