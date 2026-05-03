"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  MoonStar,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

const PREF_REMINDERS_KEY = "acme-tasks:emailReminders";

export default function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: session } = authClient.useSession();
  const subscription = useQuery(trpc.subscription.status.queryOptions());
  const projects = useQuery(trpc.projects.list.queryOptions());
  const labels = useQuery(trpc.labels.list.queryOptions());

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  // Lazy initializer keeps render and SSR in sync without a setState-in-effect.
  const [emailReminders, setEmailReminders] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(PREF_REMINDERS_KEY);
    return v === null ? true : v === "true";
  });
  function persistEmailReminders(v: boolean) {
    setEmailReminders(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREF_REMINDERS_KEY, String(v));
    }
  }

  // Export — fetch a "snapshot" via existing tRPC endpoints.
  const [exporting, setExporting] = React.useState(false);
  async function exportData() {
    setExporting(true);
    try {
      const allTasks = await queryClient.fetchQuery(
        trpc.tasks.list.queryOptions({ smart: "all", includeCompleted: true })
      );
      const dump = {
        exportedAt: new Date().toISOString(),
        user: session?.user
          ? { id: session.user.id, email: session.user.email, name: session.user.name }
          : null,
        projects: projects.data ?? [],
        labels: labels.data ?? [],
        tasks: allTasks,
      };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acme-tasks-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not export data";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  // Account deletion is a Better Auth helper; if it fails (e.g. requires
  // verification) we surface the error.
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const deleteAccount = useMutation({
    mutationFn: async () => {
      const res = await authClient.deleteUser({});
      if (res?.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.success("Account deletion requested");
      setDeleteOpen(false);
      router.replace("/sign-in");
    },
    onError: (e) => toast.error(e.message),
  });

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
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
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

        <TabsContent value="notifications" className="mt-6 space-y-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <Bell className="size-4" /> Reminders
            </h2>
            <Separator className="my-3" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Email me when a reminder fires</Label>
                <p className="text-muted-foreground text-xs">
                  Reminder emails are dispatched by the cron job. This switch is a local preference
                  for now and is stored in your browser.
                </p>
              </div>
              <Switch checked={emailReminders} onCheckedChange={persistEmailReminders} />
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

        <TabsContent value="data" className="mt-6 space-y-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <Database className="size-4" />
              Export
            </h2>
            <Separator className="my-3" />
            <p className="text-muted-foreground text-sm">
              Download a JSON snapshot of your projects, labels, and tasks (including completed).
            </p>
            <Button onClick={exportData} disabled={exporting} className="mt-3">
              <Download className="size-4" />
              {exporting ? "Preparing…" : "Export my data"}
            </Button>
          </div>

          <div className="border-destructive/40 bg-destructive/5 rounded-lg border p-5">
            <h2 className="text-destructive flex items-center gap-2 text-base font-medium">
              <TriangleAlert className="size-4" /> Danger zone
            </h2>
            <Separator className="my-3" />
            <p className="text-muted-foreground text-sm">
              Permanently delete your account and all associated tasks, projects, and labels. This
              cannot be undone.
            </p>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={() => {
                setConfirmText("");
                setDeleteOpen(true);
              }}
            >
              Delete account
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Type <span className="font-mono font-medium">delete</span> to confirm. We&apos;ll
              remove your data and sign you out.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "delete" || deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
