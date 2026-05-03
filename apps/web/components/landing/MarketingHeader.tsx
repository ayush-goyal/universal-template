import Link from "next/link";

import { Logo } from "@/components/logos/Logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="text-primary size-7" />
        <span className="text-lg font-semibold tracking-tight">Acme Tasks</span>
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/pricing"
          className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 transition"
        >
          Pricing
        </Link>
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link href="/sign-in">Log in</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
      </nav>
    </header>
  );
}
