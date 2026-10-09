import { db } from "@acme/db";

import { authorizationResponse, requireCompanyAccess } from "@/lib/authorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const call = await db.callSession.findUnique({ where: { id } });
    if (!call) return Response.json({ error: "Call not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, call.organizationId);
    return Response.json({
      call: {
        id: call.id,
        caseId: call.caseId,
        connectionState: call.connectionState,
        transcriptText: call.transcriptText,
        apiResults: call.apiResults,
        outcomeKind: call.outcomeKind,
        outcomeData: call.outcomeData,
        summary: call.summary,
        policyVersion: call.policyVersion,
        policySnapshot: call.policySnapshot,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
      },
    });
  } catch (error) {
    return authorizationResponse(error);
  }
}
