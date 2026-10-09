import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { DateTime } from "luxon";

import { db } from "@acme/db";

import { DomainManager } from "@/app/company/email/domain-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthorizationError, requireCompanyAccess } from "@/lib/authorization";
import { readSenderConfig } from "@/lib/email/domain";
import { SettingsForms } from "./settings-forms";

export default async function SettingsPage() {
  let access: Awaited<ReturnType<typeof requireCompanyAccess>>;
  try {
    access = await requireCompanyAccess(await headers());
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/sign-in");
    notFound();
  }

  const [settings, messages] = await Promise.all([
    db.companySettings.findUnique({ where: { organizationId: access.organizationId } }),
    db.emailMessage.findMany({
      where: { organizationId: access.organizationId },
      select: {
        id: true,
        caseId: true,
        recipient: true,
        subject: true,
        status: true,
        createdAt: true,
        collectionCase: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  if (!settings) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-4">
        <div className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          Workspace / Settings
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
              Company details, call guidance, and customer email in one place.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">
            {access.role === "admin" ? "Company admin" : "Agent · read only"}
          </Badge>
        </div>
        {access.role !== "admin" ? (
          <p className="bg-muted/50 text-muted-foreground rounded-xl border px-4 py-3 text-sm">
            You can view these settings and message history. A company admin can make changes.
          </p>
        ) : null}
      </header>

      <nav
        aria-label="Settings sections"
        className="bg-background/95 sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b px-1 py-2 backdrop-blur"
      >
        <a
          href="#profile"
          className="hover:bg-muted shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
        >
          Company
        </a>
        <a
          href="#policy"
          className="hover:bg-muted shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
        >
          Call policy
        </a>
        <a
          href="#email"
          className="hover:bg-muted shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
        >
          Customer email
        </a>
        {access.role === "admin" ? (
          <a
            href="#team"
            className="hover:bg-muted shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
          >
            Team
          </a>
        ) : null}
      </nav>

      <SettingsForms
        canEdit={access.role === "admin"}
        initialProfile={{
          displayName: settings.displayName,
          callbackPhone: settings.callbackPhone,
        }}
        initialPolicy={{
          policyMarkdown: settings.policyMarkdown,
          policyVersion: settings.policyVersion,
          policyHistory: Array.isArray(settings.policyHistory) ? settings.policyHistory : [],
        }}
      />

      <section id="email" className="scroll-mt-20 space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Customer email</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Configure the sender and review messages sent for your cases.
          </p>
        </div>
        {access.role === "admin" ? (
          <DomainManager
            organizationId={access.organizationId}
            domain={readSenderConfig(settings.senderConfig)}
          />
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent messages</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="bg-muted/30 rounded-xl border border-dashed px-5 py-8 text-center">
                <p className="font-medium">No messages yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Messages from case follow-ups will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {messages.map((message) => (
                  <Link
                    key={message.id}
                    href={`/dashboard/cases/${encodeURIComponent(message.caseId)}?email=${encodeURIComponent(message.id)}#emails`}
                    className="hover:bg-muted/40 -mx-3 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3.5 text-sm transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{message.subject}</span>
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                        {message.recipient} · Invoice {message.collectionCase.invoiceNumber}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">
                        {DateTime.fromJSDate(message.createdAt).toLocaleString(DateTime.DATE_MED)}
                      </span>
                      <Badge variant="outline" className="hidden capitalize sm:inline-flex">
                        {message.status.replaceAll("_", " ")}
                      </Badge>
                      <ArrowUpRight className="text-muted-foreground size-4" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {access.role === "admin" ? (
        <section id="team" className="scroll-mt-20 space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Team</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Invite agents and manage who can access your company.
            </p>
          </div>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
              <p className="text-sm font-medium">Manage staff access</p>
              <Button asChild variant="outline">
                <Link href="/company/team">Open team settings</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
