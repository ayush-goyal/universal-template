-- AlterTable
ALTER TABLE "session" ADD COLUMN     "activeOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "callbackPhone" TEXT,
    "policyMarkdown" TEXT NOT NULL DEFAULT '',
    "policyVersion" INTEGER NOT NULL DEFAULT 0,
    "policyHistory" JSONB NOT NULL DEFAULT '[]',
    "senderConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "collection_cases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "outstandingAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "caseData" JSONB NOT NULL DEFAULT '{}',
    "verificationCodeHash" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "followUp" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "policySnapshot" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "startIdempotencyKey" TEXT,
    "activeCaseId" TEXT,
    "connectionState" TEXT NOT NULL DEFAULT 'pending',
    "sessionData" JSONB NOT NULL DEFAULT '{}',
    "transcriptText" TEXT NOT NULL DEFAULT '',
    "apiResults" JSONB NOT NULL DEFAULT '[]',
    "outcomeKind" TEXT,
    "outcomeData" JSONB,
    "summary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "callId" TEXT,
    "eventKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "providerMessageId" TEXT,
    "latestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_email_status_idx" ON "invitation"("organizationId", "email", "status");

-- CreateIndex
CREATE INDEX "collection_cases_organizationId_status_idx" ON "collection_cases"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collection_cases_organizationId_id_key" ON "collection_cases"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_cases_organizationId_invoiceNumber_key" ON "collection_cases"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_providerSessionId_key" ON "call_sessions"("providerSessionId");

-- CreateIndex
CREATE INDEX "call_sessions_organizationId_caseId_startedAt_idx" ON "call_sessions"("organizationId", "caseId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_organizationId_id_key" ON "call_sessions"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_organizationId_activeCaseId_key" ON "call_sessions"("organizationId", "activeCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_organizationId_startIdempotencyKey_key" ON "call_sessions"("organizationId", "startIdempotencyKey");

-- CreateIndex
CREATE INDEX "email_messages_organizationId_caseId_createdAt_idx" ON "email_messages"("organizationId", "caseId", "createdAt");

-- CreateIndex
CREATE INDEX "email_messages_status_createdAt_idx" ON "email_messages"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_organizationId_eventKey_key" ON "email_messages"("organizationId", "eventKey");

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_organizationId_caseId_fkey" FOREIGN KEY ("organizationId", "caseId") REFERENCES "collection_cases"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_organizationId_caseId_fkey" FOREIGN KEY ("organizationId", "caseId") REFERENCES "collection_cases"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
