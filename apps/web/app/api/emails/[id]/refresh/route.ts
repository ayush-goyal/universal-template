import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { retrieveResendEmailStatus } from "@/lib/email/status";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) return Response.json({ error: "Email not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, message.organizationId);
    if (!message.providerMessageId) {
      return Response.json({ error: "No provider message to refresh." }, { status: 409 });
    }

    let status;
    try {
      status = await retrieveResendEmailStatus(message.providerMessageId);
    } catch {
      return Response.json({ error: "Could not refresh email status." }, { status: 502 });
    }
    const updated = await db.emailMessage.update({
      where: { id: message.id },
      data: {
        status,
        latestError: status === "delivery_failed" ? "Provider reported delivery failure." : null,
      },
      select: { id: true, status: true, latestError: true, updatedAt: true },
    });
    return Response.json({ message: updated });
  } catch (error) {
    return authorizationResponse(error);
  }
}
