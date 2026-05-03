import Link from "next/link";

import { Logo } from "@/components/logos/Logo";
import { Button } from "@/components/ui/button";

interface Props {
  isSignedIn?: boolean;
}

/**
 * Top bar for marketing pages. The optional `isSignedIn` prop lets a
 * server component pre-resolve auth state so signed-in visitors see an
 * "Open app" CTA instead of Log in / Get started.
 */
export function MarketingHeader({ isSignedIn = false }: Props) {
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
        {isSignedIn ? (
          <Button asChild>
            <Link href="/app/inbox">Open app →</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/sign-in">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
