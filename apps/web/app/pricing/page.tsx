"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Bell, FolderKanban, Users } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { MarketingFooter, MarketingHeader, PricingCard } from "@/components/landing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function redirectTo(url: string) {
  if (typeof window !== "undefined") window.location.href = url;
}

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
  const trpc = useTRPC();

  const checkout = useMutation(
    trpc.subscription.checkout.mutationOptions({
      onSuccess: (data) => {
        if (data.url) redirectTo(data.url);
        else toast.success("Subscription activated");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  function upgrade() {
    if (typeof window === "undefined") return;
    checkout.mutate({
      annual,
      successUrl: `${window.location.origin}/app/settings?billing=success`,
      cancelUrl: `${window.location.origin}/pricing`,
    });
  }

  return (
    <div className="bg-background min-h-screen">
      <MarketingHeader />

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
        <PricingCard
          name="Free"
          price="$0"
          caption="For getting things done."
          features={FREE_FEATURES}
          cta={
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-up">Get started</Link>
            </Button>
          }
        />
        <PricingCard
          name="Pro"
          price={`$${annual ? "3" : "4"}`}
          priceSuffix="/month"
          highlighted
          badge="Most popular"
          caption={
            annual ? "Billed $36 yearly. 7-day free trial." : "Billed monthly. 7-day free trial."
          }
          features={PRO_FEATURES}
          cta={
            <Button className="w-full" onClick={upgrade} disabled={checkout.isPending}>
              {checkout.isPending ? "Starting checkout…" : "Start 7-day free trial"}
            </Button>
          }
        />
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

      <MarketingFooter />
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
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
