import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { callHonoInternal } from "@/lib/hono-service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    const call = await db.callSession.findUnique({ where: { id } });
    if (!call) return Response.json({ error: "Call not found." }, { status: 404 });
    await requireCompanyAccess(request.headers, call.organizationId);

    if (call.connectionState !== "closed" && call.connectionState !== "failed") {
      const response = await callHonoInternal(
        `/internal/voice/sessions/${encodeURIComponent(id)}/end`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorUserId: call.actorUserId }),
        }
      );
      if (!response.ok) {
        return Response.json({ error: "Could not close the voice session." }, { status: 502 });
      }
    }
    const latest = await db.callSession.findUnique({ where: { id } });
    return Response.json({
      callId: id,
      connectionState: latest?.connectionState ?? call.connectionState,
      outcomeKind: latest?.outcomeKind ?? call.outcomeKind,
    });
  } catch (error) {
    return authorizationResponse(error);
  }
}
