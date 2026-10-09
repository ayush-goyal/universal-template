import { db } from "@acme/db";

import { authorizationResponse, requireCaseAccess, requireSameOrigin } from "@/lib/authorization";
import {
  asRecord,
  caseDetails,
  caseDetailsFromInput,
  caseView,
  moneyString,
  shortString,
} from "@/lib/collections/records";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireCaseAccess(request.headers, id);
    if (new URL(request.url).searchParams.get("includeHistory") === "0") {
      return Response.json({ case: caseView(access.collectionCase) });
    }
    const [calls, emails, timeline] = await Promise.all([
      db.callSession.findMany({
        where: { organizationId: access.organizationId, caseId: id },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          connectionState: true,
          outcomeKind: true,
          summary: true,
          startedAt: true,
        },
      }),
      db.emailMessage.findMany({
        where: { organizationId: access.organizationId, caseId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, subject: true, recipient: true, createdAt: true },
      }),
      db.caseTimelineEvent.findMany({
        where: { organizationId: access.organizationId, caseId: id },
        orderBy: { occurredAt: "asc" },
      }),
    ]);
    return Response.json({ case: caseView(access.collectionCase), calls, emails, timeline });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    const access = await requireCaseAccess(request.headers, id);
    const current = access.collectionCase;
    if (current.status === "in_call")
      return Response.json(
        { error: "Finish the active call before editing this case." },
        { status: 409 }
      );
    const body = asRecord(await request.json());
    if (!body) return Response.json({ error: "Invalid case body." }, { status: 400 });

    const customerName =
      body.customerName === undefined ? current.customerName : shortString(body.customerName);
    const invoiceNumber =
      body.invoiceNumber === undefined ? current.invoiceNumber : shortString(body.invoiceNumber);
    const outstandingAmount =
      body.outstandingAmount === undefined
        ? current.outstandingAmount.toFixed(2)
        : moneyString(body.outstandingAmount);
    if (!customerName || !invoiceNumber || !outstandingAmount) {
      return Response.json(
        { error: "Invalid name, invoice number, or decimal outstanding amount." },
        { status: 400 }
      );
    }
    const existingData = asRecord(current.caseData) ?? {};
    if ("activeArrangement" in body || "timeline" in body || "caseData" in body) {
      return Response.json(
        { error: "Arrangement and timeline are managed by the server." },
        { status: 400 }
      );
    }
    const normalized = caseDetailsFromInput({ ...caseDetails(current), ...body }, customerName);
    if (
      !normalized ||
      BigInt(String(normalized.originalAmount).replace(".", "")) <
        BigInt(outstandingAmount.replace(".", ""))
    ) {
      return Response.json({ error: "Invalid case details or original amount." }, { status: 400 });
    }
    if (typeof normalized.assignedAgentId === "string") {
      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: access.organizationId,
            userId: normalized.assignedAgentId,
          },
        },
      });
      if (!member || !["admin", "agent"].includes(member.role)) {
        return Response.json({ error: "Assignee must belong to this company." }, { status: 400 });
      }
    }
    if (
      existingData.activeArrangement &&
      outstandingAmount !== current.outstandingAmount.toFixed(2)
    ) {
      return Response.json(
        { error: "Review the active arrangement before changing the outstanding amount." },
        { status: 409 }
      );
    }
    const status = body.status === undefined ? current.status : body.status;
    if (
      typeof status !== "string" ||
      !["ready", "paused_for_review", "arrangement_recorded", "escalated", "resolved"].includes(
        status
      )
    ) {
      return Response.json({ error: "Invalid case status." }, { status: 400 });
    }
    if (status === "arrangement_recorded" && !existingData.activeArrangement) {
      return Response.json(
        { error: "An active arrangement is required for this status." },
        { status: 400 }
      );
    }
    const notes =
      body.notes === undefined
        ? current.notes
        : typeof body.notes === "string"
          ? body.notes.trim().slice(0, 5000)
          : null;
    if (notes === null || (status === "resolved" && current.status !== "resolved" && !notes)) {
      return Response.json(
        { error: "A staff note is required to confirm resolution." },
        { status: 400 }
      );
    }
    const result = await db.$transaction(async (tx) => {
      const result = await tx.collectionCase.updateMany({
        where: { id, organizationId: access.organizationId, status: { not: "in_call" } },
        data: {
          customerName,
          invoiceNumber,
          outstandingAmount,
          status,
          notes,
          ...normalized,
        },
      });
      if (result.count && status !== current.status) {
        await tx.caseTimelineEvent.create({
          data: {
            organizationId: access.organizationId,
            caseId: id,
            type: status === "resolved" ? "staff_resolution" : "status_change",
            summary: notes || `Case status changed to ${status}.`,
            occurredAt: new Date(),
            details: {
              actorUserId: access.userId,
              fromStatus: current.status,
              toStatus: status,
            },
          },
        });
      }
      return result;
    });
    if (result.count === 0)
      return Response.json({ error: "Case changed during editing." }, { status: 409 });
    const updated = await db.collectionCase.findUniqueOrThrow({ where: { id } });
    return Response.json({ case: caseView(updated) });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    if (asRecord(error)?.code === "P2002")
      return Response.json(
        { error: "Invoice number already exists in this company." },
        { status: 409 }
      );
    return authorizationResponse(error);
  }
}
