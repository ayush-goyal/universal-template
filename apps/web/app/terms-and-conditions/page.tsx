import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";

import { MarketingFooter, MarketingHeader } from "@/components/landing";

const LAST_UPDATED = "May 2026";

const TERMS_MARKDOWN = `
By creating an Acme Tasks account you agree to these terms. They're written
to be plain — please read them.

## The service

Acme Tasks is provided "as is" without warranty of any kind. We strive for
high availability but cannot guarantee zero downtime.

## Your account

- You are responsible for keeping your sign-in credentials safe.
- One person, one account. You may not share an account with others.
- You must be at least 13 years old to use the service.

## Acceptable use

Don't use Acme Tasks to:

- Store or transmit unlawful, abusive, or infringing content.
- Attempt to disrupt the service for other users.
- Reverse-engineer the product to build a competitor.

We may suspend accounts that violate these rules.

## Subscriptions

- The Pro plan is billed monthly or annually via Stripe.
- A 7-day free trial is available the first time you start a Pro
  subscription. You can cancel anytime during the trial without being
  charged.
- Cancellations take effect at the end of the current billing period; you
  keep Pro features until then.
- Refunds for accidental charges are handled case-by-case — email
  support@acme.example.

## Free tier limits

The free plan is limited to 5 projects and 50 active tasks per project.
Reminders, AI features, and unlimited projects require Pro.

## Termination

You can delete your account at any time from **Settings → Data → Danger
zone**. We may terminate accounts that violate these terms after providing
notice except in cases of severe abuse.

## Changes

We may update these terms occasionally. Material changes will be announced
in-app or via email. Continued use after changes constitutes acceptance.

## Contact

Questions? Reach out at support@acme.example or open an issue on the
repository.

_Last updated: ${LAST_UPDATED}_
`;

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The agreement that governs your use of Acme Tasks.",
};

export default function TermsAndConditions() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground text-xs tracking-wider uppercase">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
          Terms and Conditions
        </h1>
        <article className="prose prose-sm dark:prose-invert mt-6 max-w-none">
          <Markdown>{TERMS_MARKDOWN}</Markdown>
        </article>
        <p className="text-muted-foreground mt-10 text-xs">
          See also our{" "}
          <Link href="/privacy-policy" className="hover:text-foreground underline">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
