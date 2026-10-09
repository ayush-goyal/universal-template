import { db } from "@acme/db";

import { authorizationResponse, requireCompanyAccess } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId");
    const access = await requireCompanyAccess(request.headers, requestedOrganizationId, ["admin"]);
    const members = await db.member.findMany({
      where: { organizationId: access.organizationId, role: { in: ["admin", "agent"] } },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ members });
  } catch (error) {
    return authorizationResponse(error);
  }
}
