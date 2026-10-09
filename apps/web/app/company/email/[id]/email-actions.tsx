"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EmailActions({
  messageId,
  canReview,
  canRetry,
  canRefresh,
  initialSubject,
  initialBody,
  onUpdated,
}: {
  messageId: string;
  canReview: boolean;
  canRetry: boolean;
  canRefresh: boolean;
  initialSubject: string;
  initialBody: string;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [savedSubject, setSavedSubject] = useState(initialSubject);
  const [savedBody, setSavedBody] = useState(initialBody);
  const dirty = subject !== savedSubject || body !== savedBody;

  async function act(action: "retry" | "refresh" | "draft" | "approve" | "save") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/emails/${encodeURIComponent(messageId)}${action === "save" ? "" : `/${action}`}`,
        {
          method: action === "save" ? "PATCH" : "POST",
          headers: action === "save" ? { "Content-Type": "application/json" } : undefined,
          body: action === "save" ? JSON.stringify({ subject, body }) : undefined,
        }
      );
      const result = (await response.json()) as {
        error?: string;
        subject?: string;
        body?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "Email action failed.");
        return;
      }
      if (action === "draft" || action === "save") {
        const nextSubject = result.subject ?? subject;
        const nextBody = result.body ?? body;
        setSubject(nextSubject);
        setBody(nextBody);
        setSavedSubject(nextSubject);
        setSavedBody(nextBody);
      }
      setMessage(
        action === "approve"
          ? "Approved and queued for delivery."
          : action === "retry"
            ? "Original message queued again."
            : "Email updated."
      );
      router.refresh();
      onUpdated?.();
    } catch {
      setError("Email action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {canReview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review before sending</CardTitle>
            <p className="text-muted-foreground text-sm leading-6">
              Check the exact wording. Recorded outcome details must stay intact.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={12}
                maxLength={5_000}
                className="min-h-60 leading-6"
              />
            </div>
            {dirty ? (
              <p className="text-muted-foreground text-xs">Save your edits before approving.</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                disabled={busy || dirty}
                onClick={() => void act("approve")}
                className="w-full sm:order-3 sm:w-auto"
              >
                Approve and queue
              </Button>
              <Button
                variant="outline"
                disabled={busy || !dirty}
                onClick={() => void act("save")}
                className="w-full sm:order-2 sm:w-auto"
              >
                Save edits
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act("draft")}
                className="w-full sm:order-1 sm:w-auto"
              >
                Generate checked draft
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {canRefresh || canRetry ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            {canRefresh ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act("refresh")}
                className="w-full sm:w-auto"
              >
                Refresh delivery status
              </Button>
            ) : null}
            {canRetry ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act("retry")}
                className="w-full sm:w-auto"
              >
                Retry original message
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {message ? (
        <p role="status" className="rounded-lg border px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
