import { db } from "@acme/db";

import { authorizationResponse, requireCaseAccess } from "@/lib/authorization";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireCaseAccess(request.headers, id);
    const emails = await db.emailMessage.findMany({
      where: { organizationId: access.organizationId, caseId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        callId: true,
        eventKey: true,
        recipient: true,
        fromAddress: true,
        subject: true,
        body: true,
        status: true,
        providerMessageId: true,
        latestError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return Response.json({ emails });
  } catch (error) {
    return authorizationResponse(error);
  }
}
