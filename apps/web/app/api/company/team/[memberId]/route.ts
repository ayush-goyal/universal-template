import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    requireSameOrigin(request);
    const organizationId = new URL(request.url).searchParams.get("organizationId");
    const access = await requireCompanyAccess(request.headers, organizationId, ["admin"]);
    const { memberId } = await params;
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId: access.organizationId, role: "agent" },
    });
    if (!member) return Response.json({ error: "Agent not found." }, { status: 404 });

    await db.member.delete({ where: { id: member.id } });
    return Response.json({ removedMemberId: member.id });
  } catch (error) {
    return authorizationResponse(error);
  }
}
