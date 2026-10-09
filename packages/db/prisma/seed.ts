import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

import type { Prisma } from "../src/client.node";
import { db } from "../src/client.node";
import { cases, policyMarkdown } from "./demo-fixtures";

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const organizationId = id(1);
const publishedAt = "2026-09-01T12:00:00.000Z";
const demoPassword = "demo-password";

const logins = [
  {
    email: "platform@summit-climate.example",
    name: "Demo Platform Admin",
    isPlatformAdmin: true,
    role: null,
  },
  {
    email: "admin@summit-climate.example",
    name: "Demo Company Admin",
    isPlatformAdmin: false,
    role: "admin",
  },
  {
    email: "agent@summit-climate.example",
    name: "Demo Collections Agent",
    isPlatformAdmin: false,
    role: "agent",
  },
] as const;

async function seed() {
  const policyOnly = process.argv.includes("--policy-only");
  const passwordHash = await hashPassword(demoPassword);
  const now = new Date();
  const seedPolicyHistory = [
    { version: 1, markdown: policyMarkdown, publishedAt, authorUserId: "system:demo-seed" },
  ];

  await db.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { id: organizationId },
      create: {
        id: organizationId,
        name: "Summit Climate Services",
        slug: "summit-climate-demo",
        createdAt: new Date(publishedAt),
      },
      update: {},
    });
    const currentSettings = await tx.companySettings.findUnique({ where: { organizationId } });
    const currentHistory = Array.isArray(currentSettings?.policyHistory)
      ? currentSettings.policyHistory
      : [];
    const mayRefreshSeedPolicy = Boolean(
      currentSettings &&
      currentSettings.policyMarkdown !== policyMarkdown &&
      currentHistory.some(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          entry.version === currentSettings.policyVersion &&
          entry.markdown === currentSettings.policyMarkdown &&
          entry.authorUserId === "system:demo-seed"
      )
    );
    const nextPolicyVersion = (currentSettings?.policyVersion ?? 0) + 1;
    await tx.companySettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        displayName: "Summit Climate Services",
        policyMarkdown,
        policyVersion: 1,
        policyHistory: seedPolicyHistory,
      },
      // Preserve published admin edits and version every seed-owned policy change.
      update: mayRefreshSeedPolicy
        ? {
            policyMarkdown,
            policyVersion: nextPolicyVersion,
            policyHistory: [
              ...currentHistory,
              {
                version: nextPolicyVersion,
                markdown: policyMarkdown,
                publishedAt: now.toISOString(),
                authorUserId: "system:demo-seed",
              },
            ] as Prisma.InputJsonValue,
          }
        : {},
    });

    if (policyOnly) return;

    for (const [index, item] of cases.entries()) {
      const activeArrangement = "existingArrangement" in item ? item.existingArrangement : null;
      const caseData = { activeArrangement };
      const caseId = id(100 + index);
      const seededNote = "staffNote" in item ? item.staffNote : "";
      const existingCase = await tx.collectionCase.findUnique({
        where: { id: caseId },
        select: { notes: true },
      });
      await tx.collectionCase.upsert({
        where: { id: caseId },
        create: {
          id: caseId,
          organizationId,
          customerName: item.customerName,
          invoiceNumber: item.invoiceNumber,
          outstandingAmount: item.outstandingAmount,
          status: activeArrangement ? "arrangement_recorded" : "ready",
          customerType: item.customerType,
          billingEmail: item.billingEmail,
          invoiceDate: item.invoiceDate,
          originalAmount: item.originalAmount,
          serviceDescription: item.serviceDescription,
          serviceDate: item.serviceDate,
          authorizedContactName: item.authorizedContactName,
          authorizedContactRole: item.authorizedContactRole,
          caseData: caseData as Prisma.InputJsonValue,
          notes: seededNote,
        },
        update: {
          billingEmail: item.billingEmail,
          ...(seededNote && !existingCase?.notes ? { notes: seededNote } : {}),
        },
      });
      for (const event of item.timeline) {
        await tx.caseTimelineEvent.upsert({
          where: { id: event.id },
          create: {
            id: event.id,
            organizationId,
            caseId,
            type: event.type,
            summary: event.summary,
            occurredAt: new Date(event.occurredAt),
            details: "amount" in event ? { amount: event.amount } : {},
          },
          update: {
            summary: event.summary,
            occurredAt: new Date(event.occurredAt),
            details: "amount" in event ? { amount: event.amount } : {},
          },
        });
      }
      const priorCalls = "priorCalls" in item ? item.priorCalls : [];
      for (const prior of priorCalls) {
        const startedAt = new Date(prior.occurredAt);
        const outcomeKind = "outcomeKind" in prior ? prior.outcomeKind : "no_outcome";
        await tx.callSession.upsert({
          where: { id: prior.id },
          create: {
            id: prior.id,
            organizationId,
            caseId,
            actorUserId: "system:demo-seed",
            policyVersion: 1,
            policySnapshot: policyMarkdown,
            connectionState: "closed",
            sessionData: { demoHistory: true, channel: "phone" },
            transcriptText: prior.transcriptText,
            outcomeKind,
            outcomeData:
              outcomeKind === "arrangement"
                ? {
                    schedule: activeArrangement?.installments ?? [],
                    readBackConfirmed: true,
                    description: prior.summary,
                    demoHistory: true,
                  }
                : { demoHistory: true },
            summary: prior.summary,
            startedAt,
            endedAt: new Date(startedAt.getTime() + 10 * 60_000),
          },
          update: {},
        });
      }
      const priorEmails = "priorEmails" in item ? item.priorEmails : [];
      for (const prior of priorEmails) {
        const occurredAt = new Date(prior.occurredAt);
        await tx.emailMessage.upsert({
          where: { id: prior.id },
          create: {
            id: prior.id,
            organizationId,
            caseId,
            eventKey: `${prior.id}:history`,
            recipient: item.billingEmail,
            fromAddress: "billing@summit-climate.example",
            subject: prior.subject,
            body: prior.body,
            status: "historical_mock",
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
          update: {},
        });
      }
    }

    for (const login of logins) {
      const user = await tx.user.upsert({
        where: { email: login.email },
        create: {
          id: randomUUID(),
          email: login.email,
          name: login.name,
          emailVerified: true,
          isPlatformAdmin: login.isPlatformAdmin,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: login.name,
          emailVerified: true,
          isPlatformAdmin: login.isPlatformAdmin,
          updatedAt: now,
        },
      });

      const credential = await tx.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      if (credential) {
        await tx.account.update({
          where: { id: credential.id },
          data: { password: passwordHash, updatedAt: now },
        });
      } else {
        await tx.account.create({
          data: {
            id: randomUUID(),
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      if (!login.role) continue;
      await tx.member.upsert({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        create: {
          id: randomUUID(),
          organizationId,
          userId: user.id,
          role: login.role,
          createdAt: now,
        },
        update: { role: login.role },
      });
    }
  });

  if (policyOnly) {
    process.stdout.write("Refreshed the seed-owned Summit collections policy.\n");
    return;
  }

  process.stdout.write(
    [
      "Seeded Summit Climate Services demo cases.",
      `Sign in at /sign-in with password ${demoPassword}`,
      ...logins.map((login) => `  ${login.email}  ${login.name}`),
      "",
    ].join("\n")
  );
}

try {
  await seed();
} finally {
  await db.$disconnect();
}
