import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { loadEmailContext } from "@/lib/email/context";
import { generateDraft, validateDraft } from "@/lib/email/draft";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) return Response.json({ error: "Email not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, message.organizationId);
    if (message.status !== "pending_review" || message.providerMessageId) {
      return Response.json({ error: "This email cannot be redrafted." }, { status: 409 });
    }

    let context;
    try {
      context = await loadEmailContext(message);
    } catch {
      return Response.json({ error: "Email outcome requires staff review." }, { status: 409 });
    }
    let draft;
    try {
      draft = await generateDraft(context.facts, context.call.outcomeKind ?? "");
      validateDraft(context.facts, draft.subject, draft.body);
    } catch {
      return Response.json({ error: "Could not produce a checked email draft." }, { status: 502 });
    }

    const updated = await db.emailMessage.updateMany({
      where: {
        id,
        organizationId: message.organizationId,
        status: "pending_review",
        providerMessageId: null,
      },
      data: { subject: draft.subject, body: draft.body, latestError: null },
    });
    if (updated.count !== 1) {
      return Response.json(
        { error: "Email state changed. Refresh and try again." },
        { status: 409 }
      );
    }
    return Response.json({ subject: draft.subject, body: draft.body, status: "pending_review" });
  } catch (error) {
    return authorizationResponse(error);
  }
}
