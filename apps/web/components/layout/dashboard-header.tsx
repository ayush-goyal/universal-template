"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  const pathname = usePathname();
  const title = pathname.startsWith("/dashboard/cases")
    ? "Cases"
    : pathname.startsWith("/dashboard/settings")
      ? "Settings"
      : "Dashboard";

  return (
    <header className="bg-background/95 border-border/70 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
      <SidebarTrigger className="size-9 rounded-lg" />
      <span className="text-muted-foreground hidden text-xs font-medium tracking-wide uppercase sm:inline">
        HVAC Collections
      </span>
      <span className="text-muted-foreground hidden text-xs sm:inline">/</span>
      <span className="text-sm font-medium">{title}</span>
    </header>
  );
}
