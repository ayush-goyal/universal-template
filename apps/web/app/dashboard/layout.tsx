import type { Metadata } from "next";
import { headers } from "next/headers";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

import { ProtectedRouteRedirectHandler } from "@/components/auth/ProtectedRouteRedirectHandler";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });
  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const activeMembership = activeOrganizationId
    ? await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrganizationId,
            userId: session.user.id,
          },
        },
      })
    : null;
  const membership =
    activeMembership && ["admin", "agent"].includes(activeMembership.role)
      ? activeMembership
      : await db.member.findFirst({
          where: { userId: session.user.id, role: { in: ["admin", "agent"] } },
          orderBy: { createdAt: "asc" },
        });
  const companyRole =
    membership?.role === "admin" ? "admin" : membership?.role === "agent" ? "agent" : "none";

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        user={session.user}
        role={companyRole}
        isPlatformAdmin={user?.isPlatformAdmin === true}
      />
      <div className="flex h-svh min-w-0 flex-1 flex-col">
        <DashboardHeader />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
