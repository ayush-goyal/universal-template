import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@acme/auth";

import { Logo } from "@/components/logos/Logo";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/app/inbox");
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="text-primary size-7" />
          <span className="text-lg font-semibold tracking-tight">Acme Tasks</span>
        </Link>
        <Link
          href="/pricing"
          className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition"
        >
          Pricing
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">{children}</main>
    </div>
  );
}
