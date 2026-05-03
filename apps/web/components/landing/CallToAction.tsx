import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="container mx-auto max-w-4xl px-4 py-24 text-center">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Made for the way you actually work.
      </h2>
      <p className="text-muted-foreground mx-auto mt-3 max-w-xl">
        Soft sage tones, calm typography, keyboard-first interactions. The opposite of another
        shouty productivity app.
      </p>
      <div className="mt-8">
        <Button asChild size="lg">
          <Link href="/sign-up">
            <CheckCircle2 className="size-4" /> Start free
          </Link>
        </Button>
      </div>
    </section>
  );
}
