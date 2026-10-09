import { db, Prisma } from "../src/client.node";

type Data = Record<string, unknown>;
const object = (value: unknown): Data =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {};
const string = (value: unknown): string | null => (typeof value === "string" ? value : null);

try {
  const rows = await db.collectionCase.findMany();
  let backfilled = 0;
  for (const row of rows) {
    const data = object(row.caseData);
    const legacyFields = [
      "customerType",
      "billingEmail",
      "phone",
      "invoiceDate",
      "serviceDate",
      "serviceDescription",
      "authorizedContactName",
      "authorizedContactRole",
      "originalAmount",
      "assignedAgentId",
      "preferredContactMethod",
      "doNotEmail",
      "doNotCall",
      "timeline",
      "demoScenario",
    ];
    if (!legacyFields.some((key) => key in data)) continue;
    const timeline = Array.isArray(data.timeline) ? data.timeline : [];
    const {
      customerType: _customerType,
      billingEmail: _billingEmail,
      phone: _phone,
      invoiceDate: _invoiceDate,
      serviceDate: _serviceDate,
      serviceDescription: _serviceDescription,
      authorizedContactName: _authorizedContactName,
      authorizedContactRole: _authorizedContactRole,
      originalAmount: _originalAmount,
      assignedAgentId: _assignedAgentId,
      preferredContactMethod: _preferredContactMethod,
      doNotEmail: _doNotEmail,
      doNotCall: _doNotCall,
      timeline: _timeline,
      demoScenario: _demoScenario,
      ...remainingData
    } = data;
    await db.$transaction(async (tx) => {
      await tx.collectionCase.update({
        where: { id: row.id },
        data: {
          customerType: row.customerType ?? string(data.customerType),
          billingEmail: row.billingEmail ?? string(data.billingEmail),
          phone: row.phone ?? string(data.phone),
          invoiceDate: row.invoiceDate ?? string(data.invoiceDate),
          serviceDate: row.serviceDate ?? string(data.serviceDate),
          serviceDescription: row.serviceDescription ?? string(data.serviceDescription),
          authorizedContactName: row.authorizedContactName ?? string(data.authorizedContactName),
          authorizedContactRole: row.authorizedContactRole ?? string(data.authorizedContactRole),
          originalAmount: row.originalAmount ?? string(data.originalAmount),
          assignedAgentId: row.assignedAgentId ?? string(data.assignedAgentId),
          preferredContactMethod: string(data.preferredContactMethod) ?? row.preferredContactMethod,
          doNotEmail: row.doNotEmail || data.doNotEmail === true,
          doNotCall: row.doNotCall || data.doNotCall === true,
          caseData: remainingData as Prisma.InputJsonValue,
        },
      });
      for (const item of timeline) {
        const event = object(item);
        const id = string(event.id);
        const type = string(event.type);
        const summary = string(event.summary) ?? string(event.note);
        const occurredAt = string(event.occurredAt);
        if (!id || !type || !summary || !occurredAt || Number.isNaN(Date.parse(occurredAt)))
          continue;
        const {
          id: _id,
          type: _type,
          summary: _summary,
          occurredAt: _occurredAt,
          ...details
        } = event;
        await tx.caseTimelineEvent.upsert({
          where: { id },
          create: {
            id,
            organizationId: row.organizationId,
            caseId: row.id,
            type,
            summary,
            occurredAt: new Date(occurredAt),
            details: details as Prisma.InputJsonValue,
          },
          update: {},
        });
      }
    });
    backfilled += 1;
  }
  process.stdout.write(`Backfilled ${backfilled} collection cases.\n`);
} finally {
  await db.$disconnect();
}
