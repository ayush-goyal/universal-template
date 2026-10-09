import { z } from "zod";

import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { loadEmailContext } from "@/lib/email/context";
import { validateDraft } from "@/lib/email/draft";

const editSchema = z.object({
  subject: z.string().min(5).max(120),
  body: z.string().min(20).max(5_000),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) return Response.json({ error: "Email not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, message.organizationId);
    return Response.json({ message });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await params;
    const message = await db.emailMessage.findUnique({ where: { id } });
    if (!message) return Response.json({ error: "Email not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, message.organizationId);
    if (message.status !== "pending_review" || message.providerMessageId) {
      return Response.json({ error: "This email cannot be edited." }, { status: 409 });
    }
    const parsed = editSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid email content." }, { status: 400 });

    let checked;
    try {
      const context = await loadEmailContext(message);
      checked = validateDraft(context.facts, parsed.data.subject, parsed.data.body);
    } catch {
      return Response.json(
        { error: "Email content does not match the completed outcome." },
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
      data: { subject: checked.subject, body: checked.body, latestError: null },
    });
    if (updated.count !== 1) {
      return Response.json(
        { error: "Email state changed. Refresh and try again." },
        { status: 409 }
      );
    }
    return Response.json({ id, subject: checked.subject, body: checked.body });
  } catch (error) {
    return authorizationResponse(error);
  }
}
