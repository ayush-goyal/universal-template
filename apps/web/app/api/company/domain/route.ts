import { z } from "zod";

import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { createSenderDomain, readSenderConfig } from "@/lib/email/domain";

const createSchema = z.object({
  organizationId: z.string().optional(),
  domainName: z
    .string()
    .trim()
    .toLowerCase()
    .min(4)
    .max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/),
});

export async function GET(request: Request) {
  try {
    const organizationId = new URL(request.url).searchParams.get("organizationId");
    const access = await requireCompanyAccess(request.headers, organizationId, ["admin"]);
    const settings = await db.companySettings.findUnique({
      where: { organizationId: access.organizationId },
      select: { senderConfig: true },
    });
    return Response.json({ domain: readSenderConfig(settings?.senderConfig) });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Enter a valid domain." }, { status: 400 });
    const access = await requireCompanyAccess(request.headers, parsed.data.organizationId, [
      "admin",
    ]);
    const settings = await db.companySettings.findUnique({
      where: { organizationId: access.organizationId },
      select: { senderConfig: true },
    });
    if (!settings) return Response.json({ error: "Company settings not found." }, { status: 404 });
    if (readSenderConfig(settings.senderConfig)) {
      return Response.json({ error: "A sender domain is already configured." }, { status: 409 });
    }

    const otherSettings = await db.companySettings.findMany({
      where: { organizationId: { not: access.organizationId } },
      select: { senderConfig: true },
    });
    if (
      otherSettings.some(
        (item) => readSenderConfig(item.senderConfig)?.domainName === parsed.data.domainName
      )
    ) {
      return Response.json({ error: "That domain is already in use." }, { status: 409 });
    }

    const fromAddress = `collections@${parsed.data.domainName}`;
    let domain;
    try {
      domain = await createSenderDomain(parsed.data.domainName, fromAddress);
    } catch {
      return Response.json({ error: "Could not create sender domain in Resend." }, { status: 502 });
    }
    await db.companySettings.update({
      where: { organizationId: access.organizationId },
      data: { senderConfig: domain },
    });
    return Response.json({ domain }, { status: 201 });
  } catch (error) {
    return authorizationResponse(error);
  }
}
