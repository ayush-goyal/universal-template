"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [firstAdminEmail, setFirstAdminEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, firstAdminEmail }),
      });
      const result = (await response.json()) as {
        error?: string;
        invitation?: { delivery: "sent" | "failed" };
      };
      if (!response.ok) {
        setMessageTone("error");
        setMessage(result.error ?? "Could not create the company.");
        return;
      }
      setMessageTone(result.invitation?.delivery === "sent" ? "success" : "error");
      setMessage(
        result.invitation?.delivery === "sent"
          ? "Company created and invitation sent."
          : "Company created, but the invitation could not be sent. Use Resend invitation below."
      );
      setName("");
      setSlug("");
      setFirstAdminEmail("");
      router.refresh();
    } catch {
      setMessageTone("error");
      setMessage("Could not create the company.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Create company</CardTitle>
        <CardDescription>
          Set up the workspace and send an invitation to its first admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company-slug">Slug</Label>
            <Input
              id="company-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">Used to identify the company in the app.</p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="first-admin-email">First admin email</Label>
            <Input
              id="first-admin-email"
              type="email"
              value={firstAdminEmail}
              onChange={(e) => setFirstAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t pt-4 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create and invite"}
            </Button>
            {message ? (
              <p
                role={messageTone === "error" ? "alert" : "status"}
                className={messageTone === "error" ? "text-destructive text-sm" : "text-sm"}
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
