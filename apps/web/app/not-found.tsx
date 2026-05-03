import Link from "next/link";
import { Compass } from "lucide-react";

import { Logo } from "@/components/logos/Logo";
import { Button } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="container mx-auto flex max-w-6xl items-center px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="text-primary size-7" />
          <span className="text-lg font-semibold tracking-tight">Acme Tasks</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-full">
          <Compass className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">We can&apos;t find that page</h1>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          The page you&apos;re looking for moved or never existed. Let&apos;s get you somewhere
          calmer.
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild>
            <Link href="/app/inbox">Open app</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
