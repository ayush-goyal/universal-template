import type { Metadata } from "next";
import { headers } from "next/headers";

import { auth } from "@acme/auth";

import { ProtectedRouteRedirectHandler } from "@/components/auth/ProtectedRouteRedirectHandler";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <ProtectedRouteRedirectHandler />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar user={session.user} />
      <div className="flex h-screen w-full flex-col px-4 py-4">{children}</div>
    </SidebarProvider>
  );
}
