"use client";

import Link from "next/link";

import type { NavItem } from "./data/sidebar-data";
import { NavGroup } from "@/components/layout/nav-group";
import { NavUser } from "@/components/layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { sidebarData } from "./data/sidebar-data";

type SidebarRole = "admin" | "agent" | "none";

const visiblePaths: Record<SidebarRole, readonly string[]> = {
  admin: ["/dashboard", "/dashboard/cases", "/company/team", "/dashboard/settings"],
  agent: ["/dashboard", "/dashboard/cases", "/dashboard/settings"],
  none: [],
};

function allowedItem(item: NavItem, paths: ReadonlySet<string>): NavItem | null {
  if (item.items) {
    const items = item.items.filter((child) => paths.has(child.url));
    return items.length ? { ...item, items } : null;
  }
  return item.url && paths.has(item.url) ? item : null;
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: React.ComponentProps<typeof NavUser>["user"];
  role: SidebarRole;
  isPlatformAdmin: boolean;
};

export function AppSidebar({ user, role, isPlatformAdmin, ...props }: AppSidebarProps) {
  const paths = new Set(visiblePaths[role]);
  if (isPlatformAdmin) paths.add("/platform/companies");
  const navGroups = sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => allowedItem(item, paths))
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link
          href="/dashboard"
          className="focus-visible:ring-sidebar-ring flex items-center gap-3 rounded-md px-1 py-1 outline-none focus-visible:ring-2"
          aria-label="HVAC Collections home"
        >
          <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tracking-tight">
            HC
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            <span className="block text-sm leading-tight font-semibold">HVAC Collections</span>
            <span className="text-sidebar-foreground/60 block text-[11px] leading-tight">
              Workspace
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
