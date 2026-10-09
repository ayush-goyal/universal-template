import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { readSenderConfig, refreshSenderDomain } from "@/lib/email/domain";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const organizationId = new URL(request.url).searchParams.get("organizationId");
    const access = await requireCompanyAccess(request.headers, organizationId, ["admin"]);
    const settings = await db.companySettings.findUnique({
      where: { organizationId: access.organizationId },
      select: { senderConfig: true },
    });
    const config = readSenderConfig(settings?.senderConfig);
    if (!config) return Response.json({ error: "Sender domain not found." }, { status: 404 });

    let domain;
    try {
      domain = await refreshSenderDomain(config);
    } catch {
      return Response.json({ error: "Could not refresh sender domain." }, { status: 502 });
    }
    await db.companySettings.update({
      where: { organizationId: access.organizationId },
      data: { senderConfig: domain },
    });
    if (domain.status === "verified" && domain.sendingEnabled) {
      await db.emailMessage.updateMany({
        where: { organizationId: access.organizationId, status: "blocked_domain" },
        data: { status: "queued", latestError: null },
      });
    }
    return Response.json({ domain });
  } catch (error) {
    return authorizationResponse(error);
  }
}
