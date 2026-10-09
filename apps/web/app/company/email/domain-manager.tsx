"use client";

import type { SenderConfig } from "@/lib/email/domain";
import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DomainManager({
  organizationId,
  domain,
}: {
  organizationId: string;
  domain: SenderConfig | null;
}) {
  const router = useRouter();
  const [domainName, setDomainName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function mutate(path: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setIsError(true);
        setMessage(result.error ?? "Domain request failed.");
        return;
      }
      setMessage("Domain status updated.");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Domain request failed.");
    } finally {
      setBusy(false);
    }
  }

  function create(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("/api/company/domain", { organizationId, domainName });
  }

  const domainPath = `?organizationId=${encodeURIComponent(organizationId)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Sender domain</CardTitle>
          {domain ? (
            <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
              {domain.status.replaceAll("_", " ")}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm leading-6">
          Customer email uses a domain your company controls.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {domain ? (
          <>
            <div className="bg-muted/30 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Domain</p>
                <p className="mt-1 font-medium break-all">{domain.domainName}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">From address</p>
                <p className="mt-1 font-medium break-all">{domain.fromAddress}</p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              Sending becomes available after the domain is verified by the email provider.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void mutate(`/api/company/domain/verify${domainPath}`)}
                className="w-full sm:w-auto"
              >
                Start verification
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void mutate(`/api/company/domain/refresh${domainPath}`)}
                className="w-full sm:w-auto"
              >
                Refresh status
              </Button>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">DNS records</h3>
              {domain.records.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No DNS records returned yet. Refresh the domain status to check again.
                </p>
              ) : (
                domain.records.map((record, index) => (
                  <div
                    key={`${record.name}-${record.type}-${index}`}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{record.record}</p>
                      <Badge variant="outline" className="capitalize">
                        {record.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-[6rem_minmax(0,1fr)]">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="font-mono">{record.type}</dd>
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-mono break-all">{record.name}</dd>
                      <dt className="text-muted-foreground">Value</dt>
                      <dd className="font-mono break-all">{record.value}</dd>
                    </dl>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={create}>
            <div className="grid min-w-0 flex-1 gap-2">
              <Label htmlFor="sender-domain">Domain you control</Label>
              <Input
                id="sender-domain"
                placeholder="mail.example.com"
                value={domainName}
                onChange={(event) => setDomainName(event.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">
                A subdomain such as mail.example.com works well.
              </p>
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy ? "Creating..." : "Create sender domain"}
            </Button>
          </form>
        )}
        {message ? (
          <p
            role={isError ? "alert" : "status"}
            className={
              isError
                ? "bg-destructive/10 text-destructive rounded-lg px-4 py-3"
                : "rounded-lg border px-4 py-3"
            }
          >
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
