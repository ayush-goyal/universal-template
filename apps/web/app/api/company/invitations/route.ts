import { z } from "zod";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";

const createInvitationSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  organizationId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId");
    const access = await requireCompanyAccess(request.headers, requestedOrganizationId, ["admin"]);
    const invitations = await db.invitation.findMany({
      where: { organizationId: access.organizationId, role: "agent" },
      select: { id: true, email: true, status: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ invitations });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = createInvitationSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid invitation." }, { status: 400 });

    const access = await requireCompanyAccess(request.headers, parsed.data.organizationId, [
      "admin",
    ]);
    const invitation = await auth.api.createInvitation({
      headers: request.headers,
      body: {
        email: parsed.data.email,
        role: "agent",
        organizationId: access.organizationId,
      },
    });
    return Response.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    return authorizationResponse(error);
  }
}
