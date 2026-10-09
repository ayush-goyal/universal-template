import { sendOrganizationInvitation } from "@acme/auth/email";
import { db } from "@acme/db";

import {
  authorizationResponse,
  requirePlatformAdmin,
  requireSameOrigin,
} from "@/lib/authorization";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    await requirePlatformAdmin(request.headers);
    const { id } = await params;
    const invitation = await db.invitation.findUnique({ where: { id } });
    if (
      !invitation ||
      invitation.role !== "admin" ||
      invitation.status !== "pending" ||
      invitation.expiresAt <= new Date()
    ) {
      return Response.json({ error: "Invitation not found." }, { status: 404 });
    }
    const organization = await db.organization.findUnique({
      where: { id: invitation.organizationId },
    });
    if (!organization) return Response.json({ error: "Company not found." }, { status: 404 });

    await sendOrganizationInvitation({
      to: invitation.email,
      organizationName: organization.name,
      invitationId: invitation.id,
    });
    return Response.json({ invitationId: invitation.id, delivery: "sent" });
  } catch (error) {
    return authorizationResponse(error);
  }
}
