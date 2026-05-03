import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="container mx-auto max-w-4xl px-4 py-20 text-center">
      <span className="bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
        <Sparkles className="text-primary size-3" />
        Now with AI quick-add and Plan my day
      </span>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
        The calm to-do list for{" "}
        <span className="text-primary">people who actually finish things</span>.
      </h1>
      <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base md:text-lg">
        Acme Tasks is a soft, modern Todoist clone built for consumers and professionals. Capture,
        organize, and ship — with reminders, AI, and a delightful design.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/sign-up">
            Start free <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/pricing">See pricing</Link>
        </Button>
      </div>
    </section>
  );
}
