"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ResendInvitationButton({ invitationId }: { invitationId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function resend() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/platform/invitations/${invitationId}/resend`, {
        method: "POST",
      });
      setMessage(response.ok ? "Invitation sent." : "Could not send invitation.");
    } catch {
      setMessage("Could not send invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={resend} disabled={busy}>
        {busy ? "Sending..." : "Resend invitation"}
      </Button>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
