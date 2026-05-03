import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FREE_BULLETS = ["5 projects", "50 tasks per project", "Smart views & themes"];
const PRO_BULLETS = [
  "Unlimited everything",
  "Email reminders",
  "AI quick-add & Plan my day",
  "AI project generator",
];

/**
 * Compact pricing teaser shown on the marketing landing. Links out to the
 * full /pricing page for details and Stripe checkout.
 */
export function PricingTeaser() {
  return (
    <section className="container mx-auto max-w-5xl px-4 pb-24">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Free to start. Pro when you need it.
        </h2>
        <p className="text-muted-foreground mt-2">No credit card required.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TeaserCard
          name="Free"
          price="$0"
          caption="For getting things done."
          bullets={FREE_BULLETS}
          cta={
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-up">
                Start free <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          }
        />
        <TeaserCard
          name="Pro"
          price="$3"
          priceSuffix="/mo billed yearly"
          caption="Unlimited tasks + AI superpowers."
          bullets={PRO_BULLETS}
          highlighted
          badge="7-day free trial"
          cta={
            <Button asChild className="w-full">
              <Link href="/pricing">
                See pricing <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          }
        />
      </div>
    </section>
  );
}

function TeaserCard({
  name,
  price,
  priceSuffix,
  caption,
  bullets,
  cta,
  highlighted,
  badge,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  caption: string;
  bullets: string[];
  cta: React.ReactNode;
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card relative rounded-2xl border p-6",
        highlighted ? "border-primary border-2 shadow-md" : "shadow-sm"
      )}
    >
      {badge ? (
        <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-medium">
          {badge}
        </span>
      ) : null}
      <div
        className={cn(
          "mb-1 flex items-center gap-2 text-sm font-medium tracking-wider uppercase",
          highlighted ? "text-primary" : "text-muted-foreground"
        )}
      >
        {highlighted ? <Sparkles className="size-4" /> : null}
        {name}
      </div>
      <div className="text-3xl font-semibold tracking-tight">
        {price}
        {priceSuffix ? (
          <span className="text-muted-foreground ml-1 text-sm font-normal">{priceSuffix}</span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{caption}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="text-primary mt-0.5 size-4" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">{cta}</div>
    </div>
  );
}
