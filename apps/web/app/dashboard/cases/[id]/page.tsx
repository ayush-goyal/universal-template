"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Pencil, RotateCcw } from "lucide-react";
import { DateTime } from "luxon";

import { EmailActions } from "@/app/company/email/[id]/email-actions";
import { TranscriptConversation } from "@/components/calls/transcript-conversation";
import { VoiceWorkbench } from "@/components/calls/voice-workbench";
import { CaseEditor } from "@/components/collections/case-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  customerType: string | null;
  billingEmail: string | null;
  phone: string | null;
  invoiceDate: string | null;
  originalAmount: string | null;
  serviceDate: string | null;
  serviceDescription: string | null;
  authorizedContactName: string | null;
  authorizedContactRole: string | null;
  preferredContactMethod: string;
  doNotEmail: boolean;
  doNotCall: boolean;
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
type FullEmailRecord = EmailRecord & {
  caseId: string;
  fromAddress: string;
  body: string;
  providerMessageId: string | null;
  latestError: string | null;
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

function dateOnly(value: string) {
  const date = DateTime.fromISO(value);
  return date.isValid ? date.toLocaleString(DateTime.DATE_MED) : value;
}

function money(value: string, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
}

const caseStatusLabels: Record<string, string> = {
  ready: "Ready for outreach",
  in_call: "Call in progress",
  paused_for_review: "Needs staff review",
  arrangement_recorded: "Payment plan active",
  escalated: "Staff callback needed",
  resolved: "Resolved",
};

const caseStatusDescriptions: Record<string, string> = {
  ready: "This case is ready for customer outreach.",
  in_call: "A customer call is currently in progress.",
  paused_for_review: "Outreach is paused while staff reviews the customer's concern.",
  arrangement_recorded: "A payment schedule is recorded. Payments are still due.",
  escalated: "Staff needs to follow up before outreach resumes.",
  resolved: "Staff marked this case complete.",
};

function caseStatusClass(status: string) {
  if (status === "arrangement_recorded" || status === "resolved")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (status === "paused_for_review")
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  if (status === "escalated")
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200";
  if (status === "in_call")
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

function caseStatusLabel(status: string) {
  return caseStatusLabels[status] ?? label(status);
}

const followUpReasons: Record<string, string> = {
  payment_reconciliation: "Verify reported payment",
  service_quality_dispute: "Review service concern",
  callback: "Call customer back",
};

const callOutcomeLabels: Record<string, string> = {
  arrangement: "Payment plan confirmed",
  payment_claim: "Payment reported",
  work_quality_dispute: "Service dispute",
  escalation: "Staff callback needed",
  no_outcome: "No outcome recorded",
  incomplete: "Call incomplete",
  failed: "Call failed",
};

const connectionLabels: Record<string, string> = {
  pending: "Waiting to connect",
  connecting: "Connecting",
  connected: "Connected",
  closing: "Ending call",
  closed: "Call ended",
  failed: "Connection failed",
};

const emailStatusLabels: Record<string, string> = {
  pending_review: "Needs review",
  review_required: "Needs review",
  blocked_domain: "Sending blocked",
  queued: "Queued",
  sending: "Sending",
  retrying: "Retrying",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  delivery_failed: "Delivery failed",
};

function emailBadgeClass(status: string) {
  if (status === "sent" || status === "delivered")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (["pending_review", "review_required", "retrying"].includes(status))
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  if (["blocked_domain", "failed", "delivery_failed"].includes(status))
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

const callOutcomeHelp: Record<string, string> = {
  arrangement: "The customer confirmed a payment schedule. Payments are still due.",
  payment_claim:
    "The customer reported a payment. Staff must verify it before the balance changes.",
  work_quality_dispute:
    "The customer raised a service concern. Collection is paused for staff review.",
  escalation: "A staff callback is needed to resolve this call.",
  no_outcome: "The call ended without a recorded result.",
  incomplete: "The call ended before a result could be recorded.",
  failed: "The call could not be completed.",
};

function callBadgeClass(item: CallRecord) {
  if (item.outcomeKind === "arrangement")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (["payment_claim", "work_quality_dispute"].includes(item.outcomeKind ?? ""))
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
  if (["escalation", "failed"].includes(item.outcomeKind ?? ""))
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200";
  if (["pending", "connecting", "connected"].includes(item.connectionState))
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

function callStatusLabel(item: CallRecord) {
  if (item.outcomeKind) return callOutcomeLabels[item.outcomeKind] ?? label(item.outcomeKind);
  return connectionLabels[item.connectionState] ?? label(item.connectionState);
}

function callSummary(summary: string, currency: string) {
  const arrangement =
    /^Customer confirmed (\d+) installment arrangement totaling (\d+(?:\.\d{1,2})?)\.$/.exec(
      summary
    );
  if (!arrangement?.[1] || !arrangement[2]) return summary;
  const count = Number(arrangement[1]);
  const plan = count === 1 ? "single payment" : `${count}-payment plan`;
  return `Customer confirmed a ${plan} totaling ${money(arrangement[2], currency)}.`;
}

function Arrangement({ value, currency }: { value: unknown; currency: string }) {
  const arrangement = asRecord(value);
  if (!arrangement) return null;
  const rawSchedule = arrangement.schedule ?? arrangement.installments;
  const schedule = Array.isArray(rawSchedule) ? rawSchedule.map(asRecord).filter(Boolean) : [];
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <CardTitle className="text-lg">Payment plan</CardTitle>
        <CardDescription>
          Confirmed schedule; payments have not been collected here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {schedule.length ? (
          <ol className="divide-y rounded-lg border px-4">
            {schedule.map((item, index) => (
              <li key={index} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">Payment {index + 1}</p>
                  <p className="text-muted-foreground">
                    Due {typeof item?.dueDate === "string" ? dateOnly(item.dueDate) : "—"}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {typeof item?.amount === "string" ? money(item.amount, currency) : "—"}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">No payment dates recorded.</p>
        )}
        {typeof arrangement.scheduledTotal === "string" ? (
          <div className="flex items-center justify-between border-t pt-3 font-medium">
            <span>Scheduled total</span>
            <span className="tabular-nums">{money(arrangement.scheduledTotal, currency)}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CallHistoryItem({
  item,
  currency,
  autoOpen,
  call,
  loading,
  error,
  onRetry,
}: {
  item: CallRecord;
  currency: string;
  autoOpen: boolean;
  call?: FullCallRecord;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!autoOpen) return;
    const frame = window.requestAnimationFrame(() => setExpanded(true));
    return () => window.cancelAnimationFrame(frame);
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
    <div className="overflow-hidden rounded-lg border">
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`call-detail-${item.id}`}
            onClick={toggle}
            className="hover:bg-muted/50 flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors"
          >
            <span className="min-w-0 space-y-1.5">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-sm font-medium">{dateTime(item.startedAt)}</span>
                <Badge variant="outline" className={callBadgeClass(item)}>
                  {callStatusLabel(item)}
                </Badge>
              </span>
              {item.summary ? (
                <span className="text-muted-foreground block text-sm leading-relaxed">
                  {callSummary(item.summary, currency)}
                </span>
              ) : null}
            </span>
            {expanded ? (
              <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" />
            ) : (
              <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {item.outcomeKind
            ? (callOutcomeHelp[item.outcomeKind] ?? "Recorded result for this call.")
            : "Current connection status for this call."}
        </TooltipContent>
      </Tooltip>
      {expanded ? (
        <div id={`call-detail-${item.id}`} className="space-y-5 border-t px-4 py-4 text-sm">
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
              <div className="text-sm">
                <span className="text-muted-foreground">Connection · </span>
                <span className="font-medium">
                  {connectionLabels[call.connectionState] ?? label(call.connectionState)}
                </span>
              </div>
              {call.endedAt ? (
                <p className="text-muted-foreground text-xs">Ended {dateTime(call.endedAt)}</p>
              ) : null}
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
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Policy version {call.policyVersion}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmailHistoryItem({
  item,
  autoOpen,
  onChanged,
}: {
  item: EmailRecord;
  autoOpen: boolean;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<FullEmailRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/emails/${encodeURIComponent(item.id)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { message?: FullEmailRecord; error?: string };
      if (!response.ok || !data.message)
        throw new Error(data.error ?? "Could not load email record.");
      setMessage(data.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load email record.");
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => {
    if (!autoOpen) return;
    const frame = window.requestAnimationFrame(() => {
      setExpanded(true);
      void loadMessage();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoOpen, loadMessage]);

  function toggle() {
    setExpanded((current) => !current);
    if (!expanded && !message && !loading) void loadMessage();
  }

  const current = message ?? item;
  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`email-detail-${item.id}`}
        onClick={toggle}
        className="hover:bg-muted/50 flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors"
      >
        <span className="min-w-0 space-y-1">
          <span className="block font-medium break-words">{current.subject}</span>
          <span className="text-muted-foreground block text-xs">
            {current.recipient} · {dateTime(current.createdAt)}
          </span>
          <Badge variant="outline" className={emailBadgeClass(current.status)}>
            {emailStatusLabels[current.status] ?? label(current.status)}
          </Badge>
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
        )}
      </button>
      {expanded ? (
        <div id={`email-detail-${item.id}`} className="space-y-5 border-t px-4 py-4 text-sm">
          {loading ? <p className="text-muted-foreground">Loading email…</p> : null}
          {error ? (
            <div className="space-y-2">
              <p role="alert" className="text-destructive">
                {error}
              </p>
              <Button size="sm" variant="outline" onClick={() => void loadMessage()}>
                Retry
              </Button>
            </div>
          ) : null}
          {message ? (
            <>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">Recipient</dt>
                  <dd className="mt-1 font-medium break-all">{message.recipient}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">Sender</dt>
                  <dd className="mt-1 font-medium break-all">{message.fromAddress}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Created</dt>
                  <dd className="mt-1 font-medium">{dateTime(message.createdAt)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-xs">Provider ID</dt>
                  <dd className="mt-1 font-medium break-all">{message.providerMessageId ?? "—"}</dd>
                </div>
              </dl>
              {message.latestError ? (
                <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3">
                  {message.latestError}
                </p>
              ) : null}
              <EmailActions
                messageId={message.id}
                canReview={message.status === "pending_review"}
                canRetry={message.status === "failed" && !message.providerMessageId}
                canRefresh={Boolean(message.providerMessageId)}
                initialSubject={message.subject}
                initialBody={message.body}
                onUpdated={() => {
                  void loadMessage();
                  onChanged();
                }}
              />
              {message.status !== "pending_review" ? (
                <div className="space-y-2">
                  <h4 className="font-semibold">Message</h4>
                  <pre className="bg-muted/40 rounded-xl border p-4 font-sans leading-6 break-words whitespace-pre-wrap">
                    {message.body}
                  </pre>
                </div>
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
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
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
    const frame = window.requestAnimationFrame(() => {
      historyVersion.current += 1;
      setRecord(null);
      setCalls([]);
      setEmails([]);
      setHistoryLoading(true);
      setHistoryError(null);
      void loadCase();
    });
    return () => window.cancelAnimationFrame(frame);
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
    const frame = window.requestAnimationFrame(() => {
      const search = new URLSearchParams(window.location.search);
      setSelectedCallId(search.get("call"));
      setSelectedEmailId(search.get("email"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [id]);

  useEffect(() => {
    if (!record || window.location.hash !== "#calls") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("calls")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [record, calls.length]);

  useEffect(() => {
    if (!record || window.location.hash !== "#emails") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("emails")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [record, emails.length]);

  async function refresh() {
    await Promise.all([loadCase(), loadHistory()]);
  }

  async function saveNotes() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const result = (await response.json()) as { case?: CaseRecord; error?: string };
      if (!response.ok || !result.case) throw new Error(result.error ?? "Could not save notes.");
      await refresh();
      setNotesSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save notes.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(nextStatus: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, notes }),
      });
      const result = (await response.json()) as { case?: CaseRecord; error?: string };
      if (!response.ok || !result.case) throw new Error(result.error ?? "Could not update case.");
      await refresh();
      setNotesSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update case.");
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
    record.doNotCall !== true;
  const notesChanged = notes.trim() !== (record.notes ?? "").trim();
  const canResume = ["paused_for_review", "escalated"].includes(record.status) && !openFollowUp;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 overflow-y-auto pb-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/cases">
          <ArrowLeft className="size-4" /> All cases
        </Link>
      </Button>
      {error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </p>
      ) : null}
      <header className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Case overview
              </span>
              <Badge variant="outline" className={caseStatusClass(record.status)}>
                {caseStatusLabel(record.status)}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {record.customerName}
            </h1>
            <p className="text-muted-foreground text-sm">
              Invoice {record.invoiceNumber}
              {record.customerType ? ` · ${label(record.customerType)}` : ""}
            </p>
            {record.doNotCall || record.doNotEmail ? (
              <p className="text-muted-foreground text-sm">
                Contact restrictions: {record.doNotCall ? "Do not call" : ""}
                {record.doNotCall && record.doNotEmail ? " · " : ""}
                {record.doNotEmail ? "Do not email" : ""}
              </p>
            ) : null}
          </div>
          <div className="border-t pt-4 sm:min-w-48 sm:border-t-0 sm:border-l sm:py-2 sm:pl-6 sm:text-right">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Outstanding balance
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {money(record.outstandingAmount, record.currency || "USD")}
            </p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-lg">Case details</CardTitle>
                <CardDescription>Invoice, service, and customer contact.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditor((current) => !current)}
              >
                <Pencil className="size-4" /> {showEditor ? "Close" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent className="text-sm">
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Billing email</dt>
                  <dd className="mt-1 font-medium break-all">{display(record.billingEmail)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Phone</dt>
                  <dd className="mt-1 font-medium">{display(record.phone)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Invoice date</dt>
                  <dd className="mt-1 font-medium">
                    {record.invoiceDate ? dateOnly(record.invoiceDate) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Authorized contact</dt>
                  <dd className="mt-1 font-medium">{display(record.authorizedContactName)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs">Service</dt>
                  <dd className="mt-1 font-medium">{display(record.serviceDescription)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Arrangement value={arrangement} currency={record.currency || "USD"} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="gap-1.5">
              <CardTitle className="text-lg">Next steps</CardTitle>
              <CardDescription>Actions available for this case.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                {caseStatusDescriptions[record.status] ?? "Current case status."}
              </p>
              {openFollowUp ? (
                <p className="text-muted-foreground text-xs">
                  Complete the follow-up before changing this case's status.
                </p>
              ) : null}
              {canResume ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void changeStatus(arrangement ? "arrangement_recorded" : "ready")}
                >
                  <RotateCcw className="size-4" /> Resume outreach
                </Button>
              ) : null}
              {record.status !== "resolved" && record.status !== "in_call" && !openFollowUp ? (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || !notes.trim()}
                    onClick={() => void changeStatus("resolved")}
                  >
                    <Check className="size-4" /> Mark resolved
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    {notes.trim()
                      ? "Resolve only after staff confirms the case is complete."
                      : "Add a staff note before resolving this case."}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="gap-1.5">
              <CardTitle className="text-lg">Staff notes</CardTitle>
              <CardDescription>Record decisions and context for the next teammate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="case-notes" className="sr-only">
                Staff notes
              </Label>
              <Textarea
                id="case-notes"
                rows={5}
                maxLength={5000}
                placeholder="What did staff check or decide?"
                value={notes}
                disabled={record.status === "in_call"}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setNotesSaved(false);
                }}
              />
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => void saveNotes()}
                  disabled={busy || record.status === "in_call" || !notesChanged}
                >
                  {busy ? "Saving…" : "Save notes"}
                </Button>
                {notesSaved ? (
                  <span role="status" className="text-muted-foreground text-xs">
                    Saved
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
          {record.followUp ? (
            <Card>
              <CardHeader className="gap-1.5">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg">Staff follow-up</CardTitle>
                  <CardDescription>Review the handoff from the call.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {record.followUp.status === "cancelled" ? (
                  <p className="text-muted-foreground text-xs">Cancelled</p>
                ) : null}
                <p className="font-medium">
                  {record.followUp.reason
                    ? (followUpReasons[record.followUp.reason] ?? label(record.followUp.reason))
                    : "Staff review"}
                </p>
                {record.followUp.description || record.followUp.context ? (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {record.followUp.description || record.followUp.context}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  Created {dateTime(record.followUp.createdAt)}
                  {record.followUp.completedAt
                    ? ` · Completed ${dateTime(record.followUp.completedAt)}`
                    : ""}
                </p>
                {record.followUp.notes?.length ? (
                  <div className="space-y-2 border-t pt-3">
                    <p className="font-medium">Follow-up notes</p>
                    {record.followUp.notes.map((note, index) => (
                      <p
                        key={`${note.createdAt ?? "note"}-${index}`}
                        className="whitespace-pre-wrap"
                      >
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
                    {busy ? "Saving…" : "Mark follow-up complete"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
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

      <section aria-label="Call controls">
        {canCall ? (
          <VoiceWorkbench caseId={record.id} onEnded={() => void refresh()} />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-5 text-sm">
              {record.doNotCall === true
                ? "Calls are disabled because this case is marked Do not call. Edit the case details to change this flag."
                : "Calls are available when this case is ready or has a recorded arrangement."}
            </CardContent>
          </Card>
        )}
      </section>

      <section id="calls" className="scroll-mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Call history</h2>
          <span className="text-muted-foreground text-sm">
            {calls.length} {calls.length === 1 ? "call" : "calls"}
          </span>
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
                currency={record.currency || "USD"}
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

      <section id="emails" className="scroll-mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Customer emails</h2>
          <span className="text-muted-foreground text-sm">
            {emails.length} {emails.length === 1 ? "email" : "emails"}
          </span>
        </div>
        {historyLoading && !emails.length ? (
          <p className="text-muted-foreground text-sm">Loading email history…</p>
        ) : emails.length ? (
          <div className="space-y-3">
            {emails.map((email) => (
              <EmailHistoryItem
                key={email.id}
                item={email}
                autoOpen={selectedEmailId === email.id}
                onChanged={() => void loadHistory()}
              />
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
