import type { Prisma } from "@acme/db";
import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { asArray, asRecord } from "@/lib/collections/records";

function policyView(settings: {
  organizationId: string;
  displayName: string;
  policyMarkdown: string;
  policyVersion: number;
  policyHistory: unknown;
  updatedAt: Date;
}) {
  return {
    organizationId: settings.organizationId,
    displayName: settings.displayName,
    policyMarkdown: settings.policyMarkdown,
    policyVersion: settings.policyVersion,
    policyHistory: settings.policyHistory,
    updatedAt: settings.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const access = await requireCompanyAccess(
      request.headers,
      new URL(request.url).searchParams.get("organizationId")
    );
    const settings = await db.companySettings.findUnique({
      where: { organizationId: access.organizationId },
    });
    if (!settings) return Response.json({ error: "Company settings not found." }, { status: 404 });
    return Response.json({ settings: policyView(settings) });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const access = await requireCompanyAccess(request.headers, undefined, ["admin"]);
    const body = asRecord(await request.json());
    const markdown = typeof body?.markdown === "string" ? body.markdown.trim() : "";
    if (!markdown || markdown.length > 30000) {
      return Response.json(
        { error: "Policy Markdown must contain 1 to 30,000 characters." },
        { status: 400 }
      );
    }
    const current = await db.companySettings.findUnique({
      where: { organizationId: access.organizationId },
    });
    if (!current) return Response.json({ error: "Company settings not found." }, { status: 404 });
    if (markdown === current.policyMarkdown)
      return Response.json({ settings: policyView(current) });
    const version = current.policyVersion + 1;
    const history = [
      ...asArray(current.policyHistory),
      { version, markdown, publishedAt: new Date().toISOString(), authorUserId: access.userId },
    ];
    const updated = await db.companySettings.updateMany({
      where: { organizationId: access.organizationId, policyVersion: current.policyVersion },
      data: {
        policyMarkdown: markdown,
        policyVersion: version,
        policyHistory: history as Prisma.InputJsonValue,
      },
    });
    if (updated.count === 0)
      return Response.json({ error: "Policy changed. Reload before publishing." }, { status: 409 });
    const settings = await db.companySettings.findUniqueOrThrow({
      where: { organizationId: access.organizationId },
    });
    return Response.json({ settings: policyView(settings) });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    return authorizationResponse(error);
  }
}
