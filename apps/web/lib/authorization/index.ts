import "server-only";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

export type CompanyRole = "admin" | "agent";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireActor(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) throw new AuthorizationError("Sign in required.", 401);
  if (!session.user.emailVerified) {
    throw new AuthorizationError("Verify your email before continuing.", 403);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isPlatformAdmin: true },
  });
  if (!user) throw new AuthorizationError("Sign in required.", 401);

  return {
    userId: user.id,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin,
    activeOrganizationId: session.session.activeOrganizationId ?? null,
  };
}

export async function requirePlatformAdmin(headers: Headers) {
  const actor = await requireActor(headers);
  if (!actor.isPlatformAdmin) throw new AuthorizationError("Platform access required.", 403);
  return actor;
}

export async function requireCompanyAccess(
  headers: Headers,
  organizationId?: string | null,
  allowedRoles: readonly CompanyRole[] = ["admin", "agent"]
) {
  const actor = await requireActor(headers);
  const selectedId = organizationId ?? actor.activeOrganizationId;
  const membership = selectedId
    ? await db.member.findUnique({
        where: {
          organizationId_userId: { organizationId: selectedId, userId: actor.userId },
        },
      })
    : await db.member.findFirst({
        where: { userId: actor.userId, role: { in: ["admin", "agent"] } },
        orderBy: { createdAt: "asc" },
      });

  if (!membership || !allowedRoles.includes(membership.role as CompanyRole)) {
    throw new AuthorizationError("Company record not found.", 404);
  }

  return {
    ...actor,
    organizationId: membership.organizationId,
    role: membership.role as CompanyRole,
  };
}

export async function requireCaseAccess(headers: Headers, caseId: string) {
  const collectionCase = await db.collectionCase.findUnique({ where: { id: caseId } });
  if (!collectionCase) throw new AuthorizationError("Case not found.", 404);
  const access = await requireCompanyAccess(headers, collectionCase.organizationId);
  return { ...access, collectionCase };
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new AuthorizationError("Invalid request origin.", 403);
  }
}

export function authorizationResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
