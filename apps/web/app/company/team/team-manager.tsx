"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  role: string;
  user: { name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  expiresAt: string;
};

export function TeamManager({
  organizationId,
  members,
  invitations,
}: {
  organizationId: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  async function invite(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/company/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, email }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessageTone("error");
        setMessage(result.error ?? "Could not send invitation.");
        return;
      }
      setEmail("");
      setMessageTone("success");
      setMessage("Invitation sent.");
      router.refresh();
    } catch {
      setMessageTone("error");
      setMessage("Could not send invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAgent(memberId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/company/team/${encodeURIComponent(memberId)}?organizationId=${encodeURIComponent(organizationId)}`,
        { method: "DELETE" }
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessageTone("error");
        setMessage(result.error ?? "Could not remove agent.");
        return;
      }
      setMessageTone("success");
      setMessage("Agent removed.");
      router.refresh();
    } catch {
      setMessageTone("error");
      setMessage("Could not remove agent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Invite an agent</CardTitle>
          <CardDescription>Send an email invitation to join this company.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={invite}>
            <div className="grid min-w-64 flex-1 gap-2">
              <Label htmlFor="agent-email">Email</Label>
              <Input
                id="agent-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send invitation"}
            </Button>
          </form>
          {message ? (
            <p
              role={messageTone === "error" ? "alert" : "status"}
              className={messageTone === "error" ? "text-destructive mt-3 text-sm" : "mt-3 text-sm"}
            >
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Staff</CardTitle>
            <Badge variant="outline" className="font-normal tabular-nums">
              {members.length} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium">{member.user.name}</p>
                <p className="text-muted-foreground break-all">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {member.role}
                </Badge>
                {member.role === "agent" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => removeAgent(member.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-muted-foreground py-5 text-center text-sm">
              No staff members yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <Badge variant="outline" className="font-normal tabular-nums">
              {invitations.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <span className="break-all font-medium">{invitation.email}</span>
              <span className="text-muted-foreground text-xs">
                Expires {DateTime.fromISO(invitation.expiresAt).toLocaleString(DateTime.DATE_MED)}
              </span>
            </div>
          ))}
          {invitations.length === 0 ? (
            <p className="text-muted-foreground py-5 text-center">
              No pending invitations.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
