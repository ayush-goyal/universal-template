import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

import { AcceptInvitation } from "./accept-invitation";

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invitation = await db.invitation.findUnique({ where: { id } });
  if (
    !invitation ||
    invitation.status !== "pending" ||
    invitation.expiresAt <= new Date() ||
    (invitation.role !== "admin" && invitation.role !== "agent")
  ) {
    notFound();
  }

  const organization = await db.organization.findUnique({
    where: { id: invitation.organizationId },
    select: { name: true },
  });
  if (!organization) notFound();

  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="bg-muted/20 flex min-h-svh w-full flex-col items-center justify-center gap-7 px-4 py-10">
      <div className="flex items-center gap-3" aria-label="HVAC Collections">
        <span className="bg-foreground text-background flex size-10 items-center justify-center rounded-xl text-xs font-semibold tracking-tight">
          HC
        </span>
        <span>
          <span className="block text-sm font-semibold leading-tight">HVAC Collections</span>
          <span className="text-muted-foreground block text-xs leading-tight">
            Company workspace
          </span>
        </span>
      </div>
      <div className="w-full max-w-md">
        <AcceptInvitation
          invitationId={id}
          organizationName={organization.name}
          invitedEmail={invitation.email}
          signedInEmail={session?.user.email ?? null}
          emailVerified={session?.user.emailVerified ?? false}
        />
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Need help? Contact your company administrator.{" "}
          <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
