import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "react-markdown";

import { MarketingFooter, MarketingHeader } from "@/components/landing";

const LAST_UPDATED = "May 2026";

const PRIVACY_POLICY_MARKDOWN = `
Acme Tasks is a personal productivity tool. We collect only what is needed
to make the product work and we never sell or rent your data.

## What we collect

- **Account info** — your email, optional display name, and profile image (when you sign in with Google).
- **Tasks, projects, labels, and reminders** — the data you actively create inside the app.
- **Subscription metadata** — handled by [Stripe](https://stripe.com/privacy) on our behalf when you subscribe to Pro. We store the customer + subscription IDs so we can show your plan status.
- **Operational logs** — minimal request logs and crash reports (via [Sentry](https://sentry.io/privacy/)) to keep the service healthy. We aggressively scrub task content from these logs.
- **Optional product analytics** — anonymous page-view + interaction events via [PostHog](https://posthog.com/privacy) when enabled. You can opt out from Settings.

## What we do **not** collect

- We do not read or train AI models on your task content.
- We do not place ads or share your data with advertisers.
- We do not retain backups beyond 30 days.

## How AI features work

When you use Pro AI features (quick add, plan my day, project generation,
daily summary), we send the relevant text to OpenAI for processing. Your
input is governed by [OpenAI's API data policy](https://openai.com/policies/api-data-usage-policies),
which states that prompts are not used to train their models. We send only
the minimum context needed (e.g. today's task titles for plan-my-day).

## Email reminders

If you create reminders, we send notification emails through
[Resend](https://resend.com/legal/privacy-policy). The email contains the
task title and a link back to the app; nothing else.

## Your rights

You can export every project, label, and task as JSON from the **Settings →
Data** tab. You can delete your account and all associated data from
**Settings → Data → Danger zone** at any time.

## Contact

Questions about this policy? Open an issue on our repository or email
support@acme.example.

_Last updated: ${LAST_UPDATED}_
`;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Acme Tasks collects, uses, and protects your data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingHeader />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground text-xs tracking-wider uppercase">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Privacy Policy</h1>
        <article className="prose prose-sm dark:prose-invert mt-6 max-w-none">
          <Markdown>{PRIVACY_POLICY_MARKDOWN}</Markdown>
        </article>
        <p className="text-muted-foreground mt-10 text-xs">
          See also our{" "}
          <Link href="/terms-and-conditions" className="hover:text-foreground underline">
            Terms and Conditions
          </Link>
          .
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
