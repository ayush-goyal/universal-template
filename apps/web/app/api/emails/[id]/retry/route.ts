import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { readSenderConfig, refreshSenderDomain, verifiedSender } from "@/lib/email/domain";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) return Response.json({ error: "Email not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, message.organizationId);
    if (message.providerMessageId || message.status !== "failed") {
      return Response.json({ error: "This email cannot be retried." }, { status: 409 });
    }
    if (Date.now() - message.createdAt.getTime() > 23 * 60 * 60_000) {
      return Response.json(
        { error: "This message is too old to retry safely. Review delivery with Resend." },
        { status: 409 }
      );
    }
    const settings = await db.companySettings.findUnique({
      where: { organizationId: message.organizationId },
      select: { senderConfig: true },
    });
    const configured = readSenderConfig(settings?.senderConfig);
    if (!configured) {
      return Response.json({ error: "Company sender domain is unavailable." }, { status: 409 });
    }
    let fresh;
    try {
      fresh = await refreshSenderDomain(configured);
    } catch {
      return Response.json({ error: "Could not confirm sender domain status." }, { status: 502 });
    }
    const sender = verifiedSender(fresh);
    if (!sender || sender.fromAddress !== message.fromAddress) {
      return Response.json({ error: "Company sender domain is not verified." }, { status: 409 });
    }
    await db.companySettings.update({
      where: { organizationId: message.organizationId },
      data: { senderConfig: fresh },
    });

    const updated = await db.emailMessage.updateMany({
      where: {
        id: message.id,
        organizationId: message.organizationId,
        status: "failed",
        providerMessageId: null,
      },
      data: { status: "queued", latestError: null },
    });
    if (updated.count !== 1) {
      return Response.json(
        { error: "Email state changed. Refresh and try again." },
        { status: 409 }
      );
    }
    return Response.json({ id: message.id, status: "queued" });
  } catch (error) {
    return authorizationResponse(error);
  }
}
