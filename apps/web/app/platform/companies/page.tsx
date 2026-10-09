import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { db } from "@acme/db";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthorizationError, requirePlatformAdmin } from "@/lib/authorization";
import { CompanyForm } from "./company-form";
import { ResendInvitationButton } from "./resend-invitation-button";

export default async function PlatformCompaniesPage() {
  try {
    await requirePlatformAdmin(await headers());
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/sign-in");
    notFound();
  }

  const companies = await db.organization.findMany({
    select: { id: true, name: true, slug: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const invitations = await db.invitation.findMany({
    where: { organizationId: { in: companies.map((company) => company.id) }, role: "admin" },
    select: { id: true, organizationId: true, email: true, status: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 overflow-y-auto pb-8">
      <header className="space-y-2 border-b pb-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Platform administration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
        <p className="text-muted-foreground text-sm">
          Create a company and invite its first administrator.
        </p>
      </header>
      <CompanyForm />
      <section className="space-y-4" aria-label="Companies">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Company directory</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Organizations with access to this workspace.
            </p>
          </div>
          <Badge variant="outline" className="font-normal tabular-nums">
            {companies.length} total
          </Badge>
        </div>
        {companies.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-10 text-center">
              <p className="font-medium">No companies yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Create the first company above to send its admin invitation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {companies.map((company) => {
              const invitation = invitations.find((item) => item.organizationId === company.id);
              return (
                <Card key={company.id} className="gap-3 py-5 shadow-none">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{company.name}</CardTitle>
                      <CardDescription>/{company.slug}</CardDescription>
                    </div>
                    <Badge
                      variant={invitation?.status === "accepted" ? "secondary" : "outline"}
                      className="capitalize"
                    >
                      {invitation ? invitation.status : "No invitation"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    {invitation ? (
                      <>
                        <p className="min-w-0">
                          <span className="text-muted-foreground">First admin</span>{" "}
                          <span className="break-all font-medium">{invitation.email}</span>
                        </p>
                        {invitation.status === "pending" && invitation.expiresAt > new Date() ? (
                          <ResendInvitationButton invitationId={invitation.id} />
                        ) : null}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No first admin invitation recorded.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
