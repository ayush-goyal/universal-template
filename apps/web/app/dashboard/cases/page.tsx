"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, Plus, RefreshCw, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FollowUp = { status?: string; reason?: string; context?: string };
type CaseRow = {
  id: string;
  customerName: string;
  invoiceNumber: string;
  outstandingAmount: string;
  currency: string;
  status: string;
  caseData?: Record<string, unknown> | null;
  followUp?: FollowUp | null;
};

function isOpenFollowUp(item: CaseRow) {
  return Boolean(
    item.followUp && !["completed", "cancelled"].includes(item.followUp.status ?? "open")
  );
}

function hasFlag(item: CaseRow) {
  return (
    isOpenFollowUp(item) ||
    ["paused_for_review", "escalated"].includes(item.status) ||
    item.caseData?.doNotCall === true ||
    item.caseData?.doNotEmail === true
  );
}

function contactRestricted(item: CaseRow) {
  return item.caseData?.doNotCall === true || item.caseData?.doNotEmail === true;
}

function priority(item: CaseRow) {
  if (isOpenFollowUp(item)) return 0;
  if (["paused_for_review", "escalated"].includes(item.status)) return 1;
  if (contactRestricted(item)) return 2;
  return 3;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function money(amount: string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount));
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows: CaseRow[] = [];
      let page = 1;
      let total = 0;
      do {
        const response = await fetch(`/api/cases?page=${page}&pageSize=100`, { cache: "no-store" });
        const data = (await response.json()) as {
          cases?: CaseRow[];
          total?: number;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Could not load cases.");
        if (!data.cases?.length && rows.length < (data.total ?? 0)) {
          throw new Error("Case list changed while loading. Refresh to try again.");
        }
        rows.push(...(data.cases ?? []));
        total = data.total ?? rows.length;
        page += 1;
      } while (rows.length < total);
      setCases(rows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load cases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function completeFollowUp(caseId: string) {
    setBusyId(caseId);
    setError(null);
    try {
      const response = await fetch(`/api/handoffs/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = (await response.json()) as { case?: CaseRow; error?: string };
      const updatedCase = data.case;
      if (!response.ok || !updatedCase)
        throw new Error(data.error ?? "Could not complete follow-up.");
      setCases((current) => current.map((item) => (item.id === caseId ? updatedCase : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete follow-up.");
    } finally {
      setBusyId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = cases
    .filter((item) => {
      if (
        query &&
        !item.customerName.toLowerCase().includes(query) &&
        !item.invoiceNumber.toLowerCase().includes(query)
      )
        return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (flagFilter === "flagged" && !hasFlag(item)) return false;
      if (flagFilter === "follow_up" && !isOpenFollowUp(item)) return false;
      if (
        flagFilter === "do_not_contact" &&
        item.caseData?.doNotCall !== true &&
        item.caseData?.doNotEmail !== true
      )
        return false;
      return true;
    })
    .sort((a, b) => priority(a) - priority(b) || a.customerName.localeCompare(b.customerName));

  const openFollowUps = cases.filter(isOpenFollowUp).length;
  const restricted = cases.filter(contactRestricted).length;
  const needsAttention = cases.filter(hasFlag).length;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 overflow-y-auto pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cases</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Work through flagged cases first, then open the full case when you need more detail.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button asChild>
            <Link href="/dashboard/cases/new">
              <Plus className="size-4" /> New case
            </Link>
          </Button>
        </div>
      </div>

      <section aria-label="Case summary" className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70 gap-1 py-4 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium">All cases</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{cases.length}</p>
            </div>
            <span className="bg-muted rounded-lg p-2">
              <ArrowRight className="text-muted-foreground size-4" aria-hidden="true" />
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 gap-1 py-4 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Needs attention</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{needsAttention}</p>
            </div>
            <span className="rounded-lg bg-amber-500/10 p-2">
              <CircleAlert
                className="size-4 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
            </span>
          </CardContent>
        </Card>
        <Card className="border-border/70 gap-1 py-4 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium">Open follow-ups</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{openFollowUps}</p>
            </div>
            <span className="rounded-lg bg-rose-500/10 p-2">
              <ShieldAlert className="size-4 text-rose-700 dark:text-rose-400" aria-hidden="true" />
            </span>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Find cases</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="space-y-1.5">
            <Label htmlFor="case-search">Customer or invoice</Label>
            <Input
              id="case-search"
              placeholder="Search cases"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-status-filter">Status</Label>
            <select
              id="case-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="in_call">In call</option>
              <option value="paused_for_review">Paused for review</option>
              <option value="arrangement_recorded">Arrangement recorded</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-flag-filter">Flags</Label>
            <select
              id="case-flag-filter"
              value={flagFilter}
              onChange={(event) => setFlagFilter(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="all">All cases</option>
              <option value="flagged">Flagged</option>
              <option value="follow_up">Needs follow-up</option>
              <option value="do_not_contact">Contact restricted</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Case worklist</CardTitle>
            <p className="text-muted-foreground text-xs">
              Flagged cases appear first · {restricted} contact restricted
            </p>
          </div>
          <span className="text-muted-foreground text-sm">
            {visible.length} of {cases.length} cases
          </span>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-sm">Loading cases…</p> : null}
          {!loading && !cases.length && !error ? (
            <p className="text-muted-foreground text-sm">
              No cases yet. Create one to get started.
            </p>
          ) : null}
          {!loading && cases.length > 0 && !visible.length ? (
            <p className="text-muted-foreground text-sm">No cases match these filters.</p>
          ) : null}
          {visible.length ? (
            <div className="space-y-3 md:hidden">
              {visible.map((item) => (
                <div key={item.id} className="border-border/70 space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.customerName}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Invoice {item.invoiceNumber}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {money(item.outstandingAmount, item.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{label(item.status)}</Badge>
                    {isOpenFollowUp(item) ? (
                      <Badge variant="destructive">
                        Follow-up: {label(item.followUp?.reason ?? "open")}
                      </Badge>
                    ) : null}
                    {contactRestricted(item) ? (
                      <Badge variant="secondary">Contact restricted</Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-2 border-t pt-3">
                    {isOpenFollowUp(item) && item.status !== "in_call" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void completeFollowUp(item.id)}
                      >
                        <Check className="size-4" /> {busyId === item.id ? "Saving…" : "Complete"}
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="secondary" className="ml-auto">
                      <Link href={`/dashboard/cases/${item.id}`}>
                        Open case <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {visible.length ? (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 pr-4">Invoice</th>
                    <th className="py-3 pr-4">Outstanding</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Flags</th>
                    <th className="py-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id} className="border-b align-top last:border-0">
                      <td className="py-4 pr-4 font-medium">{item.customerName}</td>
                      <td className="py-4 pr-4">{item.invoiceNumber}</td>
                      <td className="py-4 pr-4">{money(item.outstandingAmount, item.currency)}</td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline">{label(item.status)}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          {isOpenFollowUp(item) ? (
                            <Badge variant="destructive" title={item.followUp?.context}>
                              Follow-up: {label(item.followUp?.reason ?? "open")}
                            </Badge>
                          ) : null}
                          {["paused_for_review", "escalated"].includes(item.status) ? (
                            <Badge variant="secondary">Review needed</Badge>
                          ) : null}
                          {item.caseData?.doNotCall === true ? (
                            <Badge variant="outline">Do not call</Badge>
                          ) : null}
                          {item.caseData?.doNotEmail === true ? (
                            <Badge variant="outline">Do not email</Badge>
                          ) : null}
                          {!hasFlag(item) ? <span className="text-muted-foreground">—</span> : null}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isOpenFollowUp(item) && item.status !== "in_call" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === item.id}
                              onClick={() => void completeFollowUp(item.id)}
                            >
                              <Check className="size-4" />
                              {busyId === item.id ? "Saving…" : "Complete"}
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/dashboard/cases/${item.id}`}>
                              Open <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
