import { randomUUID } from "node:crypto";
import { z } from "zod";

import { sendOrganizationInvitation } from "@acme/auth/email";
import { db } from "@acme/db";

import {
  authorizationResponse,
  requirePlatformAdmin,
  requireSameOrigin,
} from "@/lib/authorization";

const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  firstAdminEmail: z.email().transform((email) => email.toLowerCase()),
});

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request.headers);
    const companies = await db.organization.findMany({
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ companies });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await requirePlatformAdmin(request.headers);
    const parsed = createCompanySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid company details." }, { status: 400 });
    }

    const { name, slug, firstAdminEmail } = parsed.data;
    if (await db.organization.findUnique({ where: { slug } })) {
      return Response.json({ error: "Company slug is already in use." }, { status: 409 });
    }

    const now = new Date();
    const organizationId = randomUUID();
    const invitationId = randomUUID();
    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { id: organizationId, name, slug, createdAt: now },
      });
      await tx.companySettings.create({
        data: { organizationId, displayName: name },
      });
      const invitation = await tx.invitation.create({
        data: {
          id: invitationId,
          organizationId,
          inviterId: actor.userId,
          email: firstAdminEmail,
          role: "admin",
          status: "pending",
          createdAt: now,
          expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        },
      });
      return { organization, invitation };
    });

    let invitationDelivery: "sent" | "failed" = "sent";
    try {
      await sendOrganizationInvitation({
        to: result.invitation.email,
        organizationName: result.organization.name,
        invitationId: result.invitation.id,
      });
    } catch {
      invitationDelivery = "failed";
    }

    return Response.json(
      {
        company: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          status: result.invitation.status,
          delivery: invitationDelivery,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return authorizationResponse(error);
  }
}
