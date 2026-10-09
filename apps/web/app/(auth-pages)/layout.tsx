import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@acme/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="bg-muted/20 flex min-h-svh w-full flex-col items-center justify-center gap-7 px-4 py-10">
      <div className="flex items-center gap-3" aria-label="HVAC Collections">
        <span className="bg-foreground text-background flex size-10 items-center justify-center rounded-xl text-xs font-semibold tracking-tight">
          HC
        </span>
        <span>
          <span className="block text-sm font-semibold leading-tight">HVAC Collections</span>
          <span className="text-muted-foreground block text-xs leading-tight">
            Company workspace
          </span>
        </span>
      </div>
      {children}
    </main>
  );
}
