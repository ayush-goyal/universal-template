"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Props = {
  invitationId: string;
  organizationName: string;
  invitedEmail: string;
  signedInEmail: string | null;
  emailVerified: boolean;
};

export function AcceptInvitation({
  invitationId,
  organizationName,
  invitedEmail,
  signedInEmail,
  emailVerified,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const invitationPath = `/accept-invitation/${encodeURIComponent(invitationId)}`;

  async function acceptInvitation() {
    setBusy(true);
    try {
      const result = await authClient.organization.acceptInvitation({ invitationId });
      if (result.error) {
        toast.error(result.error.message ?? "Could not accept invitation.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not accept invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email: invitedEmail,
        callbackURL: invitationPath,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Could not send verification email.");
        return;
      }
      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not send verification email.");
    } finally {
      setBusy(false);
    }
  }

  async function register(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-collection-invitation-id": invitationId,
        },
        body: JSON.stringify({
          name,
          email: invitedEmail,
          password,
          callbackURL: invitationPath,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "message" in body
            ? String(body.message)
            : "Could not create your account.";
        toast.error(message);
        return;
      }
      setVerificationSent(true);
    } catch {
      toast.error("Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  const signedInWithInvitedEmail = signedInEmail?.toLowerCase() === invitedEmail.toLowerCase();

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="break-words text-2xl tracking-tight">
          Join {organizationName}
        </CardTitle>
        <CardDescription className="break-all">Invitation for {invitedEmail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {signedInEmail ? (
          signedInWithInvitedEmail ? (
            emailVerified ? (
              <Button className="w-full" disabled={busy} onClick={acceptInvitation}>
                {busy ? "Joining..." : "Accept invitation"}
              </Button>
            ) : (
              <div className="bg-muted/40 space-y-3 rounded-lg border p-4 text-sm">
                <p>Verify your email, then return to this invitation.</p>
                <Button variant="outline" disabled={busy} onClick={resendVerification}>
                  Resend verification email
                </Button>
              </div>
            )
          ) : (
            <p className="bg-muted/40 rounded-lg border p-4 text-sm">
              You are signed in as {signedInEmail}. Sign in as {invitedEmail} to accept this
              invitation.
            </p>
          )
        ) : verificationSent ? (
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4 text-sm">
            <p>
              Check {invitedEmail} for a verification link. Once verified, return here to accept the
              invitation.
            </p>
            <Button variant="outline" disabled={busy} onClick={resendVerification}>
              Resend verification email
            </Button>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={register}>
              <label htmlFor="invitation-name" className="block space-y-2 text-sm">
                <span>Name</span>
                <Input
                  id="invitation-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label htmlFor="invitation-password" className="block space-y-2 text-sm">
                <span>Password</span>
                <Input
                  id="invitation-password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creating account..." : "Create account and verify email"}
              </Button>
            </form>
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link
                href={`/sign-in?redirectTo=${encodeURIComponent(invitationPath)}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in to accept
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
