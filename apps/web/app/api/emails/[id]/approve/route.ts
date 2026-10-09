import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { loadEmailContext } from "@/lib/email/context";
import { readSenderConfig, refreshSenderDomain, verifiedSender } from "@/lib/email/domain";
import { validateDraft } from "@/lib/email/draft";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) return Response.json({ error: "Email not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, message.organizationId);
    if (message.status !== "pending_review" || message.providerMessageId) {
      return Response.json({ error: "This email is not waiting for approval." }, { status: 409 });
    }

    let context;
    try {
      context = await loadEmailContext(message);
      validateDraft(context.facts, message.subject, message.body);
    } catch {
      return Response.json(
        { error: "Draft facts do not match the completed outcome." },
        { status: 409 }
      );
    }
    const configured = readSenderConfig(context.settings.senderConfig);
    if (!configured) {
      return Response.json({ error: "Configure a company sender domain first." }, { status: 409 });
    }
    let fresh;
    try {
      fresh = await refreshSenderDomain(configured);
    } catch {
      return Response.json({ error: "Could not confirm sender domain status." }, { status: 502 });
    }
    await db.companySettings.update({
      where: { organizationId: message.organizationId },
      data: { senderConfig: fresh },
    });
    const sender = verifiedSender(fresh);
    if (!sender) {
      return Response.json(
        { error: "Company sender domain is not verified for sending." },
        { status: 409 }
      );
    }

    const updated = await db.emailMessage.updateMany({
      where: {
        id,
        organizationId: message.organizationId,
        status: "pending_review",
        providerMessageId: null,
      },
      data: { status: "queued", fromAddress: sender.fromAddress, latestError: null },
    });
    if (updated.count !== 1) {
      return Response.json(
        { error: "Email state changed. Refresh and try again." },
        { status: 409 }
      );
    }
    return Response.json({ id, status: "queued", fromAddress: sender.fromAddress });
  } catch (error) {
    return authorizationResponse(error);
  }
}
