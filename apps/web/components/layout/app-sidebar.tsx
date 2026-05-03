"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, CheckCircle2, Hash, Inbox, Search, Tag } from "lucide-react";
import { useTRPC } from "trpc/react";

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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { colorClasses } from "@/lib/colors";

const SMART_VIEWS = [
  { title: "Inbox", url: "/app/inbox", icon: Inbox },
  { title: "Today", url: "/app/today", icon: CalendarDays },
  { title: "Upcoming", url: "/app/upcoming", icon: CalendarRange },
  { title: "Completed", url: "/app/completed", icon: CheckCircle2 },
  { title: "Search", url: "/app/search", icon: Search },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const trpc = useTRPC();
  const { data: labels = [] } = useQuery(trpc.labels.list.queryOptions());
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

        {labels.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <Tag className="size-3.5" /> Labels
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {labels.map((label) => {
                  const colors = colorClasses(label.color);
                  return (
                    <SidebarMenuItem key={label.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/app/labels/${label.id}`}
                        tooltip={label.name}
                      >
                        <Link href={`/app/labels/${label.id}`} onClick={() => setOpenMobile(false)}>
                          <Hash className={colors.dot.replace("bg-", "text-")} />
                          <span>{label.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarUpgrade />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
