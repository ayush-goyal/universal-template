-- AlterTable
ALTER TABLE "collection_cases" ADD COLUMN     "assignedAgentId" TEXT,
ADD COLUMN     "authorizedContactName" TEXT,
ADD COLUMN     "authorizedContactRole" TEXT,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "customerType" TEXT,
ADD COLUMN     "doNotCall" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doNotEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceDate" TEXT,
ADD COLUMN     "originalAmount" DECIMAL(12,2),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferredContactMethod" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "serviceDate" TEXT,
ADD COLUMN     "serviceDescription" TEXT;

-- CreateTable
CREATE TABLE "case_timeline_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "case_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_timeline_events_organizationId_caseId_occurredAt_idx" ON "case_timeline_events"("organizationId", "caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "collection_cases_organizationId_assignedAgentId_idx" ON "collection_cases"("organizationId", "assignedAgentId");

-- AddForeignKey
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "case_timeline_events_organizationId_caseId_fkey" FOREIGN KEY ("organizationId", "caseId") REFERENCES "collection_cases"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
