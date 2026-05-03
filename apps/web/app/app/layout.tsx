import { headers } from "next/headers";

import { auth } from "@acme/auth";

import { ProtectedRouteRedirectHandler } from "@/components/auth/ProtectedRouteRedirectHandler";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { QuickAddProvider } from "@/components/tasks/QuickAddProvider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <ProtectedRouteRedirectHandler />;
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <CommandPaletteProvider>
          <QuickAddProvider>
            <header className="bg-background/70 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-3 backdrop-blur md:hidden">
              <SidebarTrigger />
              <span className="text-sm font-medium">Acme Tasks</span>
            </header>
            <main className="flex-1 overflow-y-auto">{children}</main>
          </QuickAddProvider>
        </CommandPaletteProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
