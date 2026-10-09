import { APIError } from "better-auth/api";

import { db } from "@acme/db";

export const INVITATION_HEADER = "x-collection-invitation-id";

export async function requireRegistrationInvitation(invitationId: string | null, email: unknown) {
  if (!invitationId || typeof email !== "string") {
    throw new APIError("FORBIDDEN", { message: "A valid invitation is required." });
  }

  const invitation = await db.invitation.findUnique({ where: { id: invitationId } });
  if (
    !invitation ||
    invitation.status !== "pending" ||
    invitation.expiresAt <= new Date() ||
    invitation.email.toLowerCase() !== email.trim().toLowerCase() ||
    (invitation.role !== "admin" && invitation.role !== "agent")
  ) {
    throw new APIError("FORBIDDEN", { message: "A valid invitation is required." });
  }

  return invitation;
}
