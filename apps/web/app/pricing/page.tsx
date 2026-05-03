"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, FolderKanban, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/logos/Logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Up to 5 projects",
  "Up to 50 active tasks per project",
  "Smart views: Inbox, Today, Upcoming",
  "Priorities, labels, recurrence",
  "Light and dark themes",
];

const PRO_FEATURES = [
  "Unlimited projects and tasks",
  "Email reminders",
  "AI quick add (natural language)",
  "Plan my day with AI",
  "Project generator",
  "Comments and activity",
];

export default function PricingPage() {
  const [annual, setAnnual] = React.useState(true);

  async function upgrade() {
    try {
      const res = await authClient.subscription.upgrade({
        plan: "pro",
        annual,
        successUrl: `${window.location.origin}/app/settings?billing=success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });
      if (res?.error) throw new Error(res.error.message);
      const data = res?.data as { url?: string } | undefined;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.success("Subscription activated");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't start checkout";
      toast.error(message + " — make sure Stripe keys are configured.");
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="text-primary size-7" />
          <span className="text-lg font-semibold tracking-tight">Acme Tasks</span>
        </Link>
        <Link href="/app/inbox" className="text-muted-foreground hover:text-foreground text-sm">
          Open app →
        </Link>
      </header>

      <section className="container mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Simple pricing for calm productivity
        </h1>
        <p className="text-muted-foreground mt-4 text-base md:text-lg">
          Start free. Upgrade when you need unlimited projects, AI, and reminders.
        </p>

        <div className="bg-card mt-8 inline-flex items-center gap-2 rounded-full border p-1 text-sm">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-4 py-1.5 transition",
              !annual && "bg-primary text-primary-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-4 py-1.5 transition",
              annual && "bg-primary text-primary-foreground"
            )}
          >
            Annual <span className="ml-1 text-xs opacity-80">save 25%</span>
          </button>
        </div>
      </section>

      <section className="container mx-auto grid max-w-5xl gap-6 px-4 pb-16 md:grid-cols-2">
        <div className="bg-card rounded-2xl border p-8 shadow-sm">
          <div className="text-muted-foreground mb-1 text-sm font-medium tracking-wider uppercase">
            Free
          </div>
          <div className="text-4xl font-semibold tracking-tight">$0</div>
          <p className="text-muted-foreground mt-1 text-sm">For getting things done.</p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/sign-up">Get started</Link>
          </Button>
          <ul className="mt-6 space-y-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="text-primary mt-0.5 size-4" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-primary bg-card relative rounded-2xl border-2 p-8 shadow-md">
          <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-medium">
            Most popular
          </span>
          <div className="text-primary mb-1 flex items-center gap-2 text-sm font-medium tracking-wider uppercase">
            <Sparkles className="size-4" /> Pro
          </div>
          <div className="text-4xl font-semibold tracking-tight">
            ${annual ? "3" : "4"}
            <span className="text-muted-foreground text-base font-normal">/month</span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {annual ? "Billed $36 yearly. 7-day free trial." : "Billed monthly. 7-day free trial."}
          </p>
          <Button className="mt-6 w-full" onClick={upgrade}>
            Start 7-day free trial
          </Button>
          <ul className="mt-6 space-y-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="text-primary mt-0.5 size-4" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container mx-auto grid max-w-5xl gap-4 px-4 pb-24 md:grid-cols-3">
        <Highlight icon={FolderKanban} title="Projects without limits">
          Organize life and work with as many projects, sections, and subtasks as you need.
        </Highlight>
        <Highlight icon={Bell} title="Reminders that follow you">
          Get email pings before due time so nothing slips through.
        </Highlight>
        <Highlight icon={Users} title="Built for teams of one">
          A focused, single-player Todoist with the polish of a Linear.
        </Highlight>
      </section>
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <Icon className="text-primary size-5" />
      <h3 className="mt-2 font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{children}</p>
    </div>
  );
}
