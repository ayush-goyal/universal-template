"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink, MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  const subscription = useQuery(trpc.subscription.status.queryOptions());
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences.</p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-base font-medium">Account</h2>
            <Separator className="my-3" />
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="col-span-2">{session?.user?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="col-span-2">{session?.user?.email ?? "—"}</dd>
            </dl>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/sign-in";
            }}
          >
            Sign out
          </Button>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-base font-medium">Theme</h2>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Dark mode</Label>
                <p className="text-muted-foreground text-xs">Switch to a calmer dark palette.</p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="text-muted-foreground size-4" />
                <Switch checked={isDark} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
                <MoonStar className="text-muted-foreground size-4" />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <CreditCard className="size-4" />
              Plan
            </h2>
            <Separator className="my-3" />
            {subscription.isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">
                    {subscription.data?.plan ?? "free"} plan
                  </p>
                  {subscription.data?.currentPeriodEnd ? (
                    <p className="text-muted-foreground text-xs">
                      Renews {new Date(subscription.data.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Upgrade for unlimited projects, reminders, and AI features.
                    </p>
                  )}
                </div>
                {subscription.data?.plan === "pro" ? (
                  <Button asChild variant="outline">
                    <Link href="/app/billing">
                      <ExternalLink /> Manage
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/pricing">Upgrade</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
