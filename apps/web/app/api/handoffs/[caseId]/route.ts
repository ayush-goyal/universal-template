import type { Prisma } from "@acme/db";
import { db } from "@acme/db";

import { authorizationResponse, requireCaseAccess, requireSameOrigin } from "@/lib/authorization";
import { appendTimeline, asRecord, caseView } from "@/lib/collections/records";

export async function PATCH(request: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    requireSameOrigin(request);
    const { caseId } = await context.params;
    const access = await requireCaseAccess(request.headers, caseId);
    const current = access.collectionCase;
    const followUp = asRecord(current.followUp);
    if (!followUp)
      return Response.json({ error: "No follow-up is recorded for this case." }, { status: 404 });
    if (current.status === "in_call")
      return Response.json({ error: "Finish the active call first." }, { status: 409 });
    const body = asRecord(await request.json());
    const status = body?.status;
    if (
      typeof status !== "string" ||
      !["open", "in_progress", "completed", "cancelled"].includes(status)
    ) {
      return Response.json({ error: "Invalid follow-up status." }, { status: 400 });
    }
    const note =
      body.notes === undefined
        ? ""
        : typeof body.notes === "string"
          ? body.notes.trim().slice(0, 5000)
          : null;
    if (note === null) return Response.json({ error: "Invalid note." }, { status: 400 });
    const caseStatus = body.caseStatus;
    if (
      caseStatus !== undefined &&
      (typeof caseStatus !== "string" ||
        !["ready", "arrangement_recorded", "resolved", "paused_for_review", "escalated"].includes(
          caseStatus
        ))
    ) {
      return Response.json({ error: "Invalid case status." }, { status: 400 });
    }
    if (caseStatus === "resolved" && !note) {
      return Response.json(
        { error: "A review note is required to verify resolution." },
        { status: 400 }
      );
    }
    if (caseStatus === "arrangement_recorded" && !asRecord(current.caseData)?.activeArrangement) {
      return Response.json({ error: "No active arrangement is recorded." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const updatedFollowUp = {
      ...followUp,
      status,
      updatedAt: now,
      ...(status === "completed" ? { completedAt: now } : {}),
      ...(note
        ? {
            notes: [
              ...(Array.isArray(followUp.notes) ? followUp.notes : []),
              { text: note, actorUserId: access.userId, createdAt: now },
            ],
          }
        : {}),
    };
    const data =
      note || caseStatus
        ? appendTimeline(current.caseData, {
            id: crypto.randomUUID(),
            type: caseStatus === "resolved" ? "staff_resolution" : "staff_note",
            occurredAt: now,
            summary: note || `Follow-up changed to ${status}.`,
            actorUserId: access.userId,
            followUpStatus: status,
            ...(caseStatus ? { caseStatus } : {}),
          })
        : current.caseData;
    const result = await db.collectionCase.updateMany({
      where: { id: caseId, organizationId: access.organizationId, status: { not: "in_call" } },
      data: {
        followUp: updatedFollowUp as Prisma.InputJsonValue,
        caseData: data as Prisma.InputJsonValue,
        ...(caseStatus ? { status: caseStatus } : {}),
        ...(note
          ? { notes: [current.notes, note].filter(Boolean).join("\n\n").slice(0, 5000) }
          : {}),
      },
    });
    if (result.count === 0)
      return Response.json({ error: "Case changed during review." }, { status: 409 });
    const updated = await db.collectionCase.findUniqueOrThrow({ where: { id: caseId } });
    return Response.json({ case: caseView(updated) });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    return authorizationResponse(error);
  }
}
