import { db } from "@acme/db";

import { authorizationResponse, requireCompanyAccess } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const access = await requireCompanyAccess(
      request.headers,
      url.searchParams.get("organizationId")
    );
    const caseId = url.searchParams.get("caseId");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
    const messages = await db.emailMessage.findMany({
      where: {
        organizationId: access.organizationId,
        ...(caseId ? { caseId } : {}),
      },
      select: {
        id: true,
        caseId: true,
        callId: true,
        recipient: true,
        fromAddress: true,
        subject: true,
        status: true,
        providerMessageId: true,
        latestError: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return Response.json({ messages });
  } catch (error) {
    return authorizationResponse(error);
  }
}
