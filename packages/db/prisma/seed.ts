import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

import type { Prisma } from "../src/client.node";
import { db, hashCaseCode } from "../src/client.node";
import { DEMO_ROLEPLAY } from "./demo-roleplay";

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

const policyMarkdown = `# Summit Climate Services demo collections policy

Introduce the company and identify yourself as an AI assistant. Verify the authorized billing contact before discussing any balance, invoice, payment history, or service job. A receptionist or wrong party receives only a generic callback request.

Discuss only the outstanding amount. Theo's prior $300 payment is already accounted for in his $390 outstanding amount. A customer's claim that payment was sent does not settle the account; collect the claimed date, method, and reference, stop negotiation, and create a reconciliation callback. A complaint about work quality pauses collection and goes to a service manager.

A payment arrangement may have at most two installments, each at least $50. The first must be due within 14 calendar days of agreement and the final installment within 45 calendar days. Installments must sum exactly to the outstanding amount, without fees or interest. Read back each amount and due date and obtain explicit customer confirmation. For example, a $480 balance may be paid in two $240 installments within those limits.

Do not offer a second arrangement while an active arrangement exists. Escalate requests for a human, unclear policy, unsupported terms, identity concerns, and repeated confusion through a callback task. Do not promise a live transfer in this browser demo.\n`;

const cases = [
  {
    key: "maria",
    customerName: "Maria Ellis",
    billingEmail: "maria.ellis@example.com",
    invoiceNumber: "DEMO-2026-0812-ME",
    outstandingAmount: "480.00",
    originalAmount: "480.00",
    invoiceDate: "2026-08-12",
    serviceDescription: "AC capacitor replacement",
    customerType: "residential",
    authorizedContactRole: "Customer",
    timeline: [],
  },
  {
    key: "theo",
    customerName: "Theo Ramirez",
    billingEmail: "theo.ramirez@example.com",
    invoiceNumber: "DEMO-2026-0805-TR",
    outstandingAmount: "390.00",
    originalAmount: "690.00",
    invoiceDate: "2026-08-05",
    serviceDescription: "Duct repair",
    customerType: "residential",
    authorizedContactRole: "Customer",
    timeline: [
      {
        id: "demo:theo:partial-payment",
        type: "partial_payment",
        occurredAt: "2026-08-22T14:00:00.000Z",
        summary: "Prior $300 payment recorded; $390 remains outstanding.",
        amount: "300.00",
      },
    ],
  },
  {
    key: "keisha",
    customerName: "Keisha Patel",
    billingEmail: "keisha.patel@example.com",
    invoiceNumber: "DEMO-2026-0719-KP",
    outstandingAmount: "1140.00",
    originalAmount: "1140.00",
    invoiceDate: "2026-07-19",
    serviceDescription: "AC leak repair",
    customerType: "residential",
    authorizedContactRole: "Customer",
    timeline: [
      {
        id: "demo:keisha:leak-complaint",
        type: "complaint",
        occurredAt: "2026-08-02T15:30:00.000Z",
        summary: "Customer reported the repaired AC still leaks; service quality remains disputed.",
      },
    ],
  },
  {
    key: "jordan",
    customerName: "Jordan Kim",
    billingEmail: "jordan.kim@example.com",
    invoiceNumber: "DEMO-2026-0725-JK",
    outstandingAmount: "760.00",
    originalAmount: "760.00",
    invoiceDate: "2026-07-25",
    serviceDescription: "Furnace blower motor replacement",
    customerType: "residential",
    authorizedContactRole: "Customer",
    timeline: [
      {
        id: "demo:jordan:reminder",
        type: "prior_email",
        occurredAt: "2026-08-15T13:00:00.000Z",
        summary: "Invoice reminder sent; no payment receipt recorded.",
      },
      {
        id: "demo:jordan:transfer-context",
        type: "staff_note",
        occurredAt: "2026-10-02T16:00:00.000Z",
        summary: "Customer mentioned a possible bank transfer; it has not been reconciled.",
      },
    ],
  },
  {
    key: "northside",
    customerName: "Northside Dental LLC",
    billingEmail: "billing@northsidedental.example",
    invoiceNumber: "DEMO-2026-0630-ND",
    outstandingAmount: "2250.00",
    originalAmount: "2250.00",
    invoiceDate: "2026-06-30",
    serviceDescription: "Rooftop unit repair",
    customerType: "commercial",
    authorizedContactRole: "Office manager, authorized billing contact",
    timeline: [
      {
        id: "demo:northside:receptionist",
        type: "prior_call",
        occurredAt: "2026-09-15T14:00:00.000Z",
        summary: "Receptionist answered; no account or job details were disclosed.",
      },
    ],
  },
  {
    key: "cedar",
    customerName: "Cedar Bakery LLC",
    billingEmail: "owner@cedarbakery.example",
    invoiceNumber: "DEMO-2026-0730-CB",
    outstandingAmount: "910.00",
    originalAmount: "910.00",
    invoiceDate: "2026-07-30",
    serviceDescription: "Air handler service",
    customerType: "commercial",
    authorizedContactRole: "Owner, authorized billing contact",
    timeline: [
      {
        id: "demo:cedar:existing-arrangement",
        type: "prior_call",
        occurredAt: "2026-09-25T17:00:00.000Z",
        summary:
          "Existing $910 arrangement confirmed with owner; two $455 installments remain scheduled.",
      },
    ],
  },
] as const;

async function seed() {
  const passwordHash = await hashPassword(demoPassword);
  const now = new Date();

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
    await tx.companySettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        displayName: "Summit Climate Services",
        policyMarkdown,
        policyVersion: 1,
        policyHistory: [
          { version: 1, markdown: policyMarkdown, publishedAt, authorUserId: "system:demo-seed" },
        ],
      },
      update: {},
    });

    for (const [index, item] of cases.entries()) {
      const roleplay = DEMO_ROLEPLAY[item.key];
      const caseData = {
        customerType: item.customerType,
        billingEmail: item.billingEmail,
        phone: null,
        invoiceDate: item.invoiceDate,
        originalAmount: item.originalAmount,
        serviceDescription: item.serviceDescription,
        serviceDate: item.invoiceDate,
        authorizedContactName: roleplay.authorizedName,
        authorizedContactRole: item.authorizedContactRole,
        assignedAgentId: null,
        preferredContactMethod: "email",
        doNotEmail: false,
        doNotCall: false,
        activeArrangement:
          item.key === "cedar"
            ? {
                status: "active",
                confirmedAt: "2026-09-25T17:00:00.000Z",
                scheduledTotal: "910.00",
                installments: [
                  { dueDate: "2026-10-23", amount: "455.00" },
                  { dueDate: "2026-11-06", amount: "455.00" },
                ],
              }
            : null,
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
          status: item.key === "cedar" ? "arrangement_recorded" : "ready",
          verificationCodeHash: hashCaseCode(roleplay.code),
          caseData: caseData as Prisma.InputJsonValue,
        },
        update: {
          caseData: {
            ...preservedData,
            billingEmail: item.billingEmail,
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
