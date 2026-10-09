import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { DateTime } from "luxon";

import { db } from "@acme/db";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthorizationError, requireCompanyAccess } from "@/lib/authorization";
import { EmailActions } from "./email-actions";

export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await db.emailMessage.findUnique({ where: { id } });
  if (!message) notFound();
  try {
    await requireCompanyAccess(await headers(), message.organizationId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/sign-in");
    notFound();
  }

  return (
    <main className="bg-muted/20 min-h-svh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Link
          href="/dashboard/settings#email"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to email settings
        </Link>
        <header className="space-y-3">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
            <Mail className="size-4" aria-hidden="true" /> Customer email
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
                {message.subject}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">To {message.recipient}</p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
              {message.status.replaceAll("_", " ")}
            </Badge>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">Recipient</dt>
                <dd className="mt-1 font-medium break-all">{message.recipient}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">Sender</dt>
                <dd className="mt-1 font-medium break-all">{message.fromAddress}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Created</dt>
                <dd className="mt-1 font-medium">
                  {DateTime.fromJSDate(message.createdAt).toLocaleString(DateTime.DATETIME_MED)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">Provider ID</dt>
                <dd className="mt-1 font-medium break-all">{message.providerMessageId ?? "—"}</dd>
              </div>
            </dl>
            {message.latestError ? (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive mt-5 rounded-lg px-4 py-3 text-sm"
              >
                {message.latestError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <EmailActions
          messageId={message.id}
          canReview={message.status === "pending_review"}
          canRetry={message.status === "failed" && !message.providerMessageId}
          canRefresh={Boolean(message.providerMessageId)}
          initialSubject={message.subject}
          initialBody={message.body}
        />

        {message.status !== "pending_review" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/40 rounded-xl border p-4 font-sans text-sm leading-6 break-words whitespace-pre-wrap sm:p-6">
                {message.body}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
