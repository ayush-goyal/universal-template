import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  PhoneCall,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Prototype reporting data. Replace this object when dashboard analytics are available.
const demo = {
  metrics: [
    { label: "Outstanding balance", value: "$248.6k", detail: "Across active cases", icon: Wallet },
    { label: "Calls this week", value: "86", detail: "12% above last week", icon: PhoneCall },
    {
      label: "Positive outcomes",
      value: "70%",
      detail: "Resolved or plan agreed",
      icon: CheckCircle2,
    },
    {
      label: "Cases to review",
      value: "18",
      detail: "Flagged for a team decision",
      icon: CircleAlert,
    },
  ],
  collections: [
    { week: "W1", amount: 12.4 },
    { week: "W2", amount: 15.8 },
    { week: "W3", amount: 17.2 },
    { week: "W4", amount: 16.6 },
    { week: "W5", amount: 21.9 },
    { week: "W6", amount: 24.1 },
    { week: "W7", amount: 27.4 },
    { week: "W8", amount: 31.2 },
  ],
  outcomes: [
    { label: "Resolved", percent: 42, opacity: 1 },
    { label: "Plan agreed", percent: 28, opacity: 0.76 },
    { label: "Needs review", percent: 18, opacity: 0.52 },
    { label: "No answer", percent: 12, opacity: 0.3 },
  ],
};

export default function Dashboard() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-7 overflow-y-auto pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
            <Badge variant="outline" className="text-muted-foreground font-normal">
              Sample data
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Illustrative collections activity for this prototype.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cases">
            View cases <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <section aria-label="Sample key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {demo.metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="gap-2 py-5 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
              <div className="bg-muted/70 text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-4" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
              <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        aria-label="Sample charts"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]"
      >
        <Card className="min-w-0 shadow-none">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Collections trend</CardTitle>
              <CardDescription>Payments received, last 8 sample weeks · USD thousands</CardDescription>
            </div>
            <div className="rounded-md border px-3 py-1.5 text-right">
              <p className="text-sm font-semibold tabular-nums">$31.2k</p>
              <p className="text-muted-foreground text-[11px]">Latest week</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-1">
              <div
                className="min-w-[460px]"
                role="img"
                aria-label="Sample weekly collections: 12.4, 15.8, 17.2, 16.6, 21.9, 24.1, 27.4, and 31.2 thousand dollars."
              >
                <div className="grid h-56 grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                  <div className="text-muted-foreground flex flex-col justify-between pb-0.5 text-right text-xs">
                    <span>$40k</span>
                    <span>$30k</span>
                    <span>$20k</span>
                    <span>$10k</span>
                    <span>$0</span>
                  </div>
                  <div className="relative border-b">
                    {[0, 25, 50, 75].map((top) => (
                      <div
                        key={top}
                        className="border-border/70 absolute inset-x-0 border-t"
                        style={{ top: `${top}%` }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-end justify-around gap-3 px-2">
                      {demo.collections.map(({ week, amount }) => (
                        <div key={week} className="relative h-full flex-1">
                          <div
                            className="absolute inset-x-1 bottom-0 rounded-t-sm bg-[var(--chart-2)]"
                            style={{ height: `${(amount / 40) * 100}%` }}
                            title={`${week}: $${amount.toFixed(1)}k collected`}
                          >
                            <span className="text-muted-foreground absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[10px] font-medium tabular-nums">
                              {amount.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                  <span />
                  <div className="text-muted-foreground flex justify-around gap-3 px-2 text-center text-xs">
                    {demo.collections.map(({ week }) => (
                      <span key={week} className="flex-1">
                        {week}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Call outcomes</CardTitle>
            <CardDescription>Share of the last 100 completed sample calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {demo.outcomes.map(({ label, percent, opacity }) => (
              <div key={label} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground tabular-nums">{percent}%</span>
                </div>
                <div
                  className="bg-muted h-2 overflow-hidden rounded-full"
                  role="img"
                  aria-label={`${label}: ${percent} percent of sample calls`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: "var(--chart-2)",
                      opacity,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <p className="text-muted-foreground text-xs">
        Charts and totals are static examples; case details are available under{" "}
        <Link href="/dashboard/cases" className="text-foreground underline underline-offset-4">
          Cases
        </Link>
        .
      </p>
    </main>
  );
}
