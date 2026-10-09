import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { db } from "@acme/db";

import { AuthorizationError, requireCompanyAccess } from "@/lib/authorization";
import { TeamManager } from "./team-manager";

export default async function CompanyTeamPage() {
  let access: Awaited<ReturnType<typeof requireCompanyAccess>>;
  try {
    access = await requireCompanyAccess(await headers(), null, ["admin"]);
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/sign-in");
    notFound();
  }

  const [organization, members, invitations] = await Promise.all([
    db.organization.findUnique({
      where: { id: access.organizationId },
      select: { name: true },
    }),
    db.member.findMany({
      where: { organizationId: access.organizationId, role: { in: ["admin", "agent"] } },
      select: {
        id: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.invitation.findMany({
      where: { organizationId: access.organizationId, role: "agent", status: "pending" },
      select: { id: true, email: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!organization) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-7 overflow-y-auto pb-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Company settings
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground text-sm">
          Invite and manage agents for {organization.name}.
        </p>
      </header>
      <TeamManager
        organizationId={access.organizationId}
        members={members}
        invitations={invitations.map((invitation) => ({
          ...invitation,
          expiresAt: invitation.expiresAt.toISOString(),
        }))}
      />
    </main>
  );
}
