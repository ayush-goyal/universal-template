"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { DateTime } from "luxon";

import { TranscriptConversation } from "@/components/calls/transcript-conversation";
import { VoiceWorkbench } from "@/components/calls/voice-workbench";
import { CaseEditor } from "@/components/collections/case-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FollowUp = {
  status?: string;
  reason?: string;
  description?: string;
  context?: string;
  createdAt?: string;
  completedAt?: string;
  notes?: { text?: string; createdAt?: string }[];
};
type CaseRecord = {
  id: string;
  customerName: string;
  invoiceNumber: string;
  outstandingAmount: string;
  currency: string;
  status: string;
  notes: string;
  caseData: Record<string, unknown>;
  followUp?: FollowUp | null;
};
type CallRecord = {
  id: string;
  connectionState: string;
  outcomeKind?: string | null;
  summary?: string | null;
  startedAt: string;
};
type FullCallRecord = CallRecord & {
  caseId: string;
  transcriptText: string;
  outcomeData?: unknown;
  apiResults?: unknown;
  policyVersion: number;
  policySnapshot?: string;
  endedAt?: string | null;
};
type EmailRecord = {
  id: string;
  status: string;
  subject: string;
  recipient: string;
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function display(value: unknown) {
  return typeof value === "string" ? value : value == null ? "—" : String(value);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = DateTime.fromISO(value);
  return date.isValid ? date.toLocaleString(DateTime.DATETIME_MED) : value;
}

function money(value: string, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
}

function Arrangement({ value, currency }: { value: unknown; currency: string }) {
  const arrangement = asRecord(value);
  if (!arrangement) return null;
  const rawSchedule = arrangement.schedule ?? arrangement.installments;
  const schedule = Array.isArray(rawSchedule) ? rawSchedule.map(asRecord).filter(Boolean) : [];
  return (
    <div className="rounded-lg border p-4 text-sm">
      <p className="font-medium">Recorded arrangement</p>
      {typeof arrangement.scheduledTotal === "string" ? (
        <p className="text-muted-foreground mt-1">
          Scheduled total: {money(arrangement.scheduledTotal, currency)}
        </p>
      ) : null}
      {schedule.length ? (
        <ul className="mt-2 space-y-1">
          {schedule.map((item, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>{display(item?.dueDate)}</span>
              <span className="font-medium">
                {typeof item?.amount === "string" ? money(item.amount, currency) : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CallHistoryItem({
  item,
  autoOpen,
  call,
  loading,
  error,
  onRetry,
}: {
  item: CallRecord;
  autoOpen: boolean;
  call?: FullCallRecord;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!autoOpen) return;
    setExpanded(true);
  }, [autoOpen]);

  function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!call && !loading && !error) onRetry();
  }

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`call-detail-${item.id}`}
        onClick={toggle}
        className="hover:bg-muted/50 flex w-full items-start justify-between gap-3 rounded-lg p-4 text-left"
      >
        <span className="min-w-0 space-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{dateTime(item.startedAt)}</span>
            <Badge variant="outline">{label(item.outcomeKind ?? item.connectionState)}</Badge>
          </span>
          {item.summary ? (
            <span className="text-muted-foreground block text-sm">{item.summary}</span>
          ) : null}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
        )}
      </button>
      {expanded ? (
        <div id={`call-detail-${item.id}`} className="space-y-5 border-t p-4 text-sm">
          {loading ? <p className="text-muted-foreground">Loading call record…</p> : null}
          {error ? (
            <div className="space-y-2">
              <p role="alert" className="text-destructive">
                {error}
              </p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : null}
          {call ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Outcome</p>
                  <p className="font-medium">{label(call.outcomeKind ?? "No outcome recorded")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Connection</p>
                  <p className="font-medium">{label(call.connectionState)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Policy version</p>
                  <p className="font-medium">{call.policyVersion}</p>
                </div>
              </div>
              {call.summary ? <p className="bg-muted/50 rounded-md p-3">{call.summary}</p> : null}
              <p className="text-muted-foreground">
                Started {dateTime(call.startedAt)}
                {call.endedAt ? ` · Ended ${dateTime(call.endedAt)}` : ""}
              </p>
              <div className="space-y-2">
                <h4 className="font-semibold">Transcript</h4>
                <div className="bg-muted/20 max-h-[34rem] overflow-y-auto rounded-md border p-4">
                  <TranscriptConversation transcriptText={call.transcriptText} />
                </div>
              </div>
              {call.outcomeData ? (
                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer font-medium">Outcome details</summary>
                  <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap">
                    {JSON.stringify(call.outcomeData, null, 2)}
                  </pre>
                </details>
              ) : null}
              {Array.isArray(call.apiResults) && call.apiResults.length ? (
                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer font-medium">API results</summary>
                  <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap">
                    {JSON.stringify(call.apiResults, null, 2)}
                  </pre>
                </details>
              ) : null}
              {call.policySnapshot ? (
                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer font-medium">
                    Policy used for this call (version {call.policyVersion})
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-y-auto font-sans text-sm whitespace-pre-wrap">
                    {call.policySnapshot}
                  </pre>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [status, setStatus] = useState("ready");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [callRecords, setCallRecords] = useState<Record<string, FullCallRecord>>({});
  const [callErrors, setCallErrors] = useState<Record<string, string>>({});
  const [loadingCallIds, setLoadingCallIds] = useState<Set<string>>(() => new Set());
  const callCache = useRef<Record<string, FullCallRecord>>({});
  const inFlightCalls = useRef(new Map<string, Promise<void>>());
  const historyVersion = useRef(0);

  const fetchCall = useCallback((callId: string, force = false): Promise<void> => {
    if (!force && callCache.current[callId]) return Promise.resolve();
    const running = inFlightCalls.current.get(callId);
    if (running) return running;
    const task = (async () => {
      setLoadingCallIds((current) => new Set(current).add(callId));
      setCallErrors((current) => {
        const next = { ...current };
        delete next[callId];
        return next;
      });
      try {
        const response = await fetch(`/api/calls/${encodeURIComponent(callId)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { call?: FullCallRecord; error?: string };
        const fullCall = data.call;
        if (!response.ok || !fullCall) throw new Error(data.error ?? "Could not load call record.");
        callCache.current[callId] = fullCall;
        setCallRecords((current) => ({ ...current, [callId]: fullCall }));
      } catch (cause) {
        setCallErrors((current) => ({
          ...current,
          [callId]: cause instanceof Error ? cause.message : "Could not load call record.",
        }));
      } finally {
        setLoadingCallIds((current) => {
          const next = new Set(current);
          next.delete(callId);
          return next;
        });
        inFlightCalls.current.delete(callId);
      }
    })();
    inFlightCalls.current.set(callId, task);
    return task;
  }, []);

  const loadCase = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}?includeHistory=0`, {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        case?: CaseRecord;
        error?: string;
      };
      if (!response.ok || !result.case) throw new Error(result.error ?? "Could not load case.");
      setRecord(result.case);
      setStatus(result.case.status);
      setNotes(result.case.notes ?? "");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load case.");
    }
  }, [id]);

  const loadHistory = useCallback(async () => {
    const version = ++historyVersion.current;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = (await response.json()) as {
        calls?: CallRecord[];
        emails?: EmailRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Could not load case history.");
      if (version !== historyVersion.current) return;
      const rows = result.calls ?? [];
      setCalls(rows);
      setEmails(result.emails ?? []);
      setHistoryLoading(false);

      // Prefetch a few records at a time after the case shell has painted.
      void (async () => {
        for (let index = 0; index < rows.length; index += 4) {
          if (version !== historyVersion.current) return;
          const batch = rows.slice(index, index + 4);
          await Promise.all(
            batch.map((row) => {
              const cached = callCache.current[row.id];
              const changed =
                cached &&
                (cached.connectionState !== row.connectionState ||
                  cached.outcomeKind !== row.outcomeKind ||
                  cached.summary !== row.summary);
              return fetchCall(row.id, Boolean(changed));
            })
          );
        }
      })();
    } catch (cause) {
      if (version === historyVersion.current) {
        setHistoryError(cause instanceof Error ? cause.message : "Could not load case history.");
        setHistoryLoading(false);
      }
    }
  }, [fetchCall, id]);

  useEffect(() => {
    historyVersion.current += 1;
    setRecord(null);
    setCalls([]);
    setEmails([]);
    setHistoryLoading(true);
    setHistoryError(null);
    void loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (record?.id !== id) return;
    let timer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => void loadHistory(), 0);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [id, loadHistory, record?.id]);

  useEffect(() => {
    setSelectedCallId(new URLSearchParams(window.location.search).get("call"));
  }, [id]);

  useEffect(() => {
    if (!record || window.location.hash !== "#calls") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("calls")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [record, calls.length]);

  async function refresh() {
    await Promise.all([loadCase(), loadHistory()]);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const result = (await response.json()) as { case?: CaseRecord; error?: string };
      if (!response.ok || !result.case) throw new Error(result.error ?? "Could not save case.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save case.");
    } finally {
      setBusy(false);
    }
  }

  async function completeFollowUp() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/handoffs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not complete follow-up.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete follow-up.");
    } finally {
      setBusy(false);
    }
  }

  if (!record) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-4 overflow-y-auto pb-8">
        <Button asChild variant="link" className="px-0">
          <Link href="/dashboard/cases">← Cases</Link>
        </Button>
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground">Loading case…</p>
        )}
      </main>
    );
  }

  const openFollowUp =
    record.followUp && !["completed", "cancelled"].includes(record.followUp.status ?? "open");
  const arrangement = record.caseData?.activeArrangement;
  const canCall =
    (record.status === "ready" || record.status === "arrangement_recorded") &&
    record.caseData?.doNotCall !== true;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 overflow-y-auto pb-8">
      <Button asChild variant="link" className="px-0">
        <Link href="/dashboard/cases">← Cases</Link>
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{record.customerName}</h1>
            <Badge
              variant={
                ["escalated", "paused_for_review"].includes(record.status)
                  ? "destructive"
                  : "outline"
              }
            >
              {label(record.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Invoice {record.invoiceNumber} · {display(record.caseData?.customerType)}
          </p>
          <div className="flex flex-wrap gap-2">
            {openFollowUp ? <Badge variant="destructive">Follow-up needed</Badge> : null}
            {record.caseData?.doNotCall === true ? (
              <Badge variant="secondary">Do not call</Badge>
            ) : null}
            {record.caseData?.doNotEmail === true ? (
              <Badge variant="secondary">Do not email</Badge>
            ) : null}
            {arrangement ? <Badge variant="secondary">Arrangement recorded</Badge> : null}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Outstanding</p>
          <p className="text-3xl font-semibold">
            {money(record.outstandingAmount, record.currency || "USD")}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Case details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
              <dt className="text-muted-foreground">Billing email</dt>
              <dd className="break-all">{display(record.caseData?.billingEmail)}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{display(record.caseData?.phone)}</dd>
              <dt className="text-muted-foreground">Invoice date</dt>
              <dd>{display(record.caseData?.invoiceDate)}</dd>
              <dt className="text-muted-foreground">Service</dt>
              <dd>{display(record.caseData?.serviceDescription)}</dd>
              <dt className="text-muted-foreground">Contact</dt>
              <dd>{display(record.caseData?.authorizedContactName)}</dd>
            </dl>
            <Arrangement value={arrangement} currency={record.currency || "USD"} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor((current) => !current)}
            >
              <Pencil className="size-4" /> {showEditor ? "Close editor" : "Edit details"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status and staff notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="case-status">Status</Label>
              <select
                id="case-status"
                value={status}
                disabled={record.status === "in_call"}
                onChange={(event) => setStatus(event.target.value)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {record.status === "in_call" ? <option value="in_call">In call</option> : null}
                {[
                  "ready",
                  "paused_for_review",
                  "arrangement_recorded",
                  "escalated",
                  "resolved",
                ].map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-notes">Notes</Label>
              <Textarea
                id="case-notes"
                rows={4}
                value={notes}
                disabled={record.status === "in_call"}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <Button onClick={() => void save()} disabled={busy || record.status === "in_call"}>
              {busy ? "Saving…" : "Save case"}
            </Button>
          </CardContent>
        </Card>
      </div>
      {showEditor ? (
        <CaseEditor
          caseId={record.id}
          initialCase={record}
          onSaved={() => {
            setShowEditor(false);
            void refresh();
          }}
        />
      ) : null}

      {record.followUp ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-lg">Follow-up</CardTitle>
            <Badge variant={openFollowUp ? "destructive" : "secondary"}>
              {label(record.followUp.status ?? "open")}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{label(record.followUp.reason ?? "Staff review")}</p>
            {record.followUp.description || record.followUp.context ? (
              <p className="whitespace-pre-wrap">
                {record.followUp.description || record.followUp.context}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Created {dateTime(record.followUp.createdAt)}
              {record.followUp.completedAt
                ? ` · Completed ${dateTime(record.followUp.completedAt)}`
                : ""}
            </p>
            {record.followUp.notes?.length ? (
              <div className="space-y-2 border-t pt-3">
                <p className="font-medium">Staff notes</p>
                {record.followUp.notes.map((note, index) => (
                  <p key={`${note.createdAt ?? "note"}-${index}`} className="whitespace-pre-wrap">
                    {note.text}
                  </p>
                ))}
              </div>
            ) : null}
            {openFollowUp ? (
              <Button
                size="sm"
                disabled={busy || record.status === "in_call"}
                onClick={() => void completeFollowUp()}
              >
                {busy ? "Saving…" : "Mark complete"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section aria-label="Call controls">
        {canCall ? (
          <VoiceWorkbench caseId={record.id} onEnded={() => void refresh()} />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-5 text-sm">
              {record.caseData?.doNotCall === true
                ? "Calls are disabled because this case is marked Do not call. Edit the case details to change this flag."
                : "Calls are available when this case is ready or has a recorded arrangement."}
            </CardContent>
          </Card>
        )}
      </section>

      <section id="calls" className="scroll-mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Call history</h2>
          <span className="text-muted-foreground text-sm">{calls.length} calls</span>
        </div>
        {historyError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-destructive text-sm">
              {historyError}
            </p>
            <Button size="sm" variant="outline" onClick={() => void loadHistory()}>
              Retry history
            </Button>
          </div>
        ) : null}
        {historyLoading && !calls.length ? (
          <p className="text-muted-foreground text-sm">Loading call history…</p>
        ) : calls.length ? (
          <div className="space-y-3">
            {calls.map((call) => (
              <CallHistoryItem
                key={call.id}
                item={call}
                autoOpen={selectedCallId === call.id}
                call={callRecords[call.id]}
                loading={loadingCallIds.has(call.id)}
                error={callErrors[call.id]}
                onRetry={() => void fetchCall(call.id, true)}
              />
            ))}
          </div>
        ) : !historyError ? (
          <Card>
            <CardContent className="text-muted-foreground py-5 text-sm">No calls yet.</CardContent>
          </Card>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Customer emails</h2>
        {historyLoading && !emails.length ? (
          <p className="text-muted-foreground text-sm">Loading email history…</p>
        ) : emails.length ? (
          <div className="space-y-2">
            {emails.map((email) => (
              <Link
                href={`/company/email/${email.id}`}
                className="hover:bg-muted block rounded-lg border p-4"
                key={email.id}
              >
                <p className="font-medium">{email.subject}</p>
                <p className="text-muted-foreground text-xs">
                  {email.recipient} · {label(email.status)} · {dateTime(email.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        ) : !historyError ? (
          <Card>
            <CardContent className="text-muted-foreground py-5 text-sm">
              No customer emails yet.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
