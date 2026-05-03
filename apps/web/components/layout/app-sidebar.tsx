"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, CalendarRange, CheckCircle2, Inbox, Search } from "lucide-react";

import { NavLabels } from "@/components/layout/nav-labels";
import { NavProjects } from "@/components/layout/nav-projects";
import { NavUser } from "@/components/layout/nav-user";
import { SidebarUpgrade } from "@/components/layout/SidebarUpgrade";
import { Logo } from "@/components/logos/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const SMART_VIEWS = [
  { title: "Inbox", url: "/app/inbox", icon: Inbox },
  { title: "Today", url: "/app/today", icon: CalendarDays },
  { title: "Upcoming", url: "/app/upcoming", icon: CalendarRange },
  { title: "Reminders", url: "/app/reminders", icon: Bell },
  { title: "Completed", url: "/app/completed", icon: CheckCircle2 },
  { title: "Search", url: "/app/search", icon: Search },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Logo className="text-primary size-6" />
          <span className="text-base font-semibold tracking-tight">Acme Tasks</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SMART_VIEWS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavProjects />
        <NavLabels />

        <SidebarUpgrade />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
