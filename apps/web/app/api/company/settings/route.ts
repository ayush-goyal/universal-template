import { db } from "@acme/db";

import {
  authorizationResponse,
  requireCompanyAccess,
  requireSameOrigin,
} from "@/lib/authorization";
import { asRecord, shortString } from "@/lib/collections/records";

function settingsView(row: {
  organizationId: string;
  displayName: string;
  callbackPhone: string | null;
  policyVersion: number;
  updatedAt: Date;
}) {
  return {
    organizationId: row.organizationId,
    displayName: row.displayName,
    callbackPhone: row.callbackPhone,
    policyVersion: row.policyVersion,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const access = await requireCompanyAccess(
      request.headers,
      new URL(request.url).searchParams.get("organizationId")
    );
    const row = await db.companySettings.findUnique({
      where: { organizationId: access.organizationId },
    });
    if (!row) return Response.json({ error: "Company settings not found." }, { status: 404 });
    return Response.json({ settings: settingsView(row) });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const access = await requireCompanyAccess(request.headers, undefined, ["admin"]);
    const body = asRecord(await request.json());
    if (!body) return Response.json({ error: "Invalid settings body." }, { status: 400 });
    const data: { displayName?: string; callbackPhone?: string | null } = {};
    if (body.displayName !== undefined) {
      const displayName = shortString(body.displayName);
      if (!displayName)
        return Response.json({ error: "Display name is required." }, { status: 400 });
      data.displayName = displayName;
    }
    if (body.callbackPhone !== undefined) {
      if (body.callbackPhone !== null && typeof body.callbackPhone !== "string") {
        return Response.json({ error: "Invalid callback phone." }, { status: 400 });
      }
      const callbackPhone = typeof body.callbackPhone === "string" ? body.callbackPhone.trim() : "";
      if (callbackPhone.length > 100)
        return Response.json({ error: "Callback phone is too long." }, { status: 400 });
      data.callbackPhone = callbackPhone || null;
    }
    if (Object.keys(data).length === 0)
      return Response.json({ error: "No settings supplied." }, { status: 400 });
    const row = await db.companySettings.update({
      where: { organizationId: access.organizationId },
      data,
    });
    return Response.json({ settings: settingsView(row) });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    return authorizationResponse(error);
  }
}
