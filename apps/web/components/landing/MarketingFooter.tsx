import Link from "next/link";

import { Logo } from "@/components/logos/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground container mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs">
        <div className="flex items-center gap-2">
          <Logo className="text-primary size-5" />
          <span>Acme Tasks</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy-policy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms-and-conditions" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
        </div>
      </div>
    </footer>
  );
}
