import { db } from "@acme/db";

import { authorizationResponse, requireCompanyAccess } from "@/lib/authorization";
import { asRecord, caseView } from "@/lib/collections/records";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const access = await requireCompanyAccess(
      request.headers,
      url.searchParams.get("organizationId")
    );
    const requestedStatus = url.searchParams.get("status");
    const rows = await db.collectionCase.findMany({
      where: { organizationId: access.organizationId },
      orderBy: { updatedAt: "desc" },
    });
    const cases = rows
      .filter((row) => {
        const followUp = asRecord(row.followUp);
        return followUp && (!requestedStatus || followUp.status === requestedStatus);
      })
      .map(caseView);
    return Response.json({ cases });
  } catch (error) {
    return authorizationResponse(error);
  }
}
