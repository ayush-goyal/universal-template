"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Profile = { displayName: string; callbackPhone: string | null };
type Policy = { policyMarkdown: string; policyVersion: number; policyHistory: unknown[] };

export function SettingsForms({
  canEdit,
  initialProfile,
  initialPolicy,
}: {
  canEdit: boolean;
  initialProfile: Profile;
  initialPolicy: Policy;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.displayName);
  const [phone, setPhone] = useState(initialProfile.callbackPhone ?? "");
  const [policy, setPolicy] = useState(initialPolicy);
  const [markdown, setMarkdown] = useState(initialPolicy.policyMarkdown);
  const [profileBusy, setProfileBusy] = useState(false);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);

  async function saveProfile() {
    setProfileBusy(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      const response = await fetch("/api/company/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, callbackPhone: phone || null }),
      });
      const data = (await response.json()) as { settings?: Profile; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "Could not save profile.");
      setProfile(data.settings);
      setProfileMessage("Company profile saved.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Could not save profile.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function publishPolicy() {
    setPolicyBusy(true);
    setPolicyError(null);
    setPolicyMessage(null);
    try {
      const response = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = (await response.json()) as { settings?: Policy; error?: string };
      if (!response.ok || !data.settings)
        throw new Error(data.error ?? "Could not publish policy.");
      setPolicy(data.settings);
      setMarkdown(data.settings.policyMarkdown);
      setPolicyMessage(`Version ${data.settings.policyVersion} published.`);
    } catch (cause) {
      setPolicyError(cause instanceof Error ? cause.message : "Could not publish policy.");
    } finally {
      setPolicyBusy(false);
    }
  }

  return (
    <>
      <section id="profile" className="scroll-mt-20 space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Company</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Details the assistant uses when speaking with customers.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError ? (
              <p role="alert" className="text-destructive text-sm">
                {profileError}
              </p>
            ) : null}
            {profileMessage ? (
              <p role="status" className="text-sm">
                {profileMessage}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callbackPhone">Callback phone</Label>
                <Input
                  id="callbackPhone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
            {canEdit ? (
              <Button
                disabled={
                  profileBusy ||
                  !name.trim() ||
                  (name === profile.displayName && phone === (profile.callbackPhone ?? ""))
                }
                onClick={() => void saveProfile()}
              >
                {profileBusy ? "Saving…" : "Save profile"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section id="policy" className="scroll-mt-20 space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Call policy</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Set the guidance used by new calls. Published versions stay with the calls that used
            them.
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Published guidance</CardTitle>
              <span className="text-muted-foreground rounded-full border px-2.5 py-1 text-xs">
                Version {policy.policyVersion}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {policyError ? (
              <p role="alert" className="text-destructive text-sm">
                {policyError}
              </p>
            ) : null}
            {policyMessage ? (
              <p role="status" className="text-sm">
                {policyMessage}
              </p>
            ) : null}
            <Textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              rows={12}
              placeholder="Write payment-plan limits, escalation rules, and approved language in Markdown."
              disabled={!canEdit}
              className="font-mono text-sm leading-6"
            />
            {canEdit ? (
              <Button
                disabled={
                  policyBusy || !markdown.trim() || markdown.trim() === policy.policyMarkdown
                }
                onClick={() => void publishPolicy()}
              >
                {policyBusy ? "Publishing…" : "Publish new version"}
              </Button>
            ) : null}
            {policy.policyHistory.length ? (
              <details className="rounded-xl border text-sm">
                <summary className="cursor-pointer px-4 py-3 font-medium">Version history</summary>
                <div className="space-y-2 border-t p-3">
                  {[...policy.policyHistory].reverse().map((item, index) => (
                    <details key={index} className="bg-muted/30 rounded-lg border px-3 py-2.5">
                      <summary className="cursor-pointer font-medium">
                        Version{" "}
                        {typeof item === "object" && item && "version" in item
                          ? String(item.version)
                          : policy.policyHistory.length - index}
                      </summary>
                      <pre className="text-muted-foreground mt-3 max-h-60 overflow-y-auto border-t pt-3 text-xs whitespace-pre-wrap">
                        {typeof item === "object" &&
                        item &&
                        "markdown" in item &&
                        typeof item.markdown === "string"
                          ? item.markdown
                          : JSON.stringify(item, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              </details>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
