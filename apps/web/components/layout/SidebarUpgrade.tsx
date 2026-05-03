"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useTRPC } from "trpc/react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Calm "Upgrade to Pro" pill rendered at the bottom of the sidebar when the
 * user is on the free plan. Hidden for Pro users.
 */
export function SidebarUpgrade() {
  const trpc = useTRPC();
  const subscription = useQuery(trpc.subscription.status.queryOptions());
  const { setOpenMobile } = useSidebar();

  if (subscription.data?.plan === "pro") return null;

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="bg-primary/10 hover:bg-primary/15 data-[state=open]:bg-primary/15"
            >
              <Link href="/pricing" className="text-primary" onClick={() => setOpenMobile(false)}>
                <Sparkles />
                <span>Upgrade to Pro</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
