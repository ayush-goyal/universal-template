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
      const caseData = {
        customerType: item.customerType,
        billingEmail: item.billingEmail,
        phone: null,
        invoiceDate: item.invoiceDate,
        originalAmount: item.originalAmount,
        serviceDescription: item.serviceDescription,
        serviceDate: item.serviceDate,
        authorizedContactName: item.authorizedContactName,
        authorizedContactRole: item.authorizedContactRole,
        assignedAgentId: null,
        preferredContactMethod: "email",
        doNotEmail: false,
        doNotCall: false,
        activeArrangement,
        demoScenario: item.demoScenario,
        timeline: item.timeline.map((event) => ({ ...event })),
      };
      const caseId = id(100 + index);
      const existing = await tx.collectionCase.findUnique({ where: { id: caseId } });
      const priorData = existing?.caseData;
      const preservedData =
        priorData && typeof priorData === "object" && !Array.isArray(priorData) ? priorData : {};
      await tx.collectionCase.upsert({
        where: { id: caseId },
        create: {
          id: caseId,
          organizationId,
          customerName: item.customerName,
          invoiceNumber: item.invoiceNumber,
          outstandingAmount: item.outstandingAmount,
          status: activeArrangement ? "arrangement_recorded" : "ready",
          caseData: caseData as Prisma.InputJsonValue,
        },
        update: {
          caseData: {
            ...preservedData,
            billingEmail: item.billingEmail,
            demoScenario: item.demoScenario,
          } as Prisma.InputJsonValue,
        },
      });
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
