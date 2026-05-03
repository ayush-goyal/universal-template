import { headers } from "next/headers";

import { auth } from "@acme/auth";

import { ProtectedRouteRedirectHandler } from "@/components/auth/ProtectedRouteRedirectHandler";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { KeyboardShortcutsProvider } from "@/components/layout/keyboard-shortcuts";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { GlobalTaskDrawer } from "@/components/tasks/GlobalTaskDrawer";
import { QuickAddFab } from "@/components/tasks/QuickAddFab";
import { QuickAddProvider } from "@/components/tasks/QuickAddProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
        <KeyboardShortcutsProvider>
          <CommandPaletteProvider>
            <QuickAddProvider>
              <MobileTopBar />
              <main className="flex-1 overflow-y-auto">{children}</main>
              <QuickAddFab />
              <GlobalTaskDrawer />
            </QuickAddProvider>
          </CommandPaletteProvider>
        </KeyboardShortcutsProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
