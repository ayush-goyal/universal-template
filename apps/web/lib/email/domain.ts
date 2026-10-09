import "server-only";

export type DnsRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  status: string;
  priority?: number;
};

export type SenderConfig = {
  domainId: string;
  domainName: string;
  status: string;
  fromAddress: string;
  records: DnsRecord[];
  sendingEnabled: boolean;
};

const RESEND_BASE = "https://api.resend.com";

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readSenderConfig(value: unknown): SenderConfig | null {
  const source = object(value);
  if (
    !source ||
    typeof source.domainId !== "string" ||
    typeof source.domainName !== "string" ||
    typeof source.status !== "string" ||
    typeof source.fromAddress !== "string"
  ) {
    return null;
  }

  const records = Array.isArray(source.records)
    ? source.records.flatMap((entry): DnsRecord[] => {
        const record = object(entry);
        if (
          !record ||
          typeof record.record !== "string" ||
          typeof record.name !== "string" ||
          typeof record.type !== "string" ||
          typeof record.value !== "string"
        ) {
          return [];
        }
        return [
          {
            record: record.record,
            name: record.name,
            type: record.type,
            value: record.value,
            status: typeof record.status === "string" ? record.status : "unknown",
            ...(typeof record.priority === "number" ? { priority: record.priority } : {}),
          },
        ];
      })
    : [];

  return {
    domainId: source.domainId,
    domainName: source.domainName,
    status: source.status,
    fromAddress: source.fromAddress,
    records,
    sendingEnabled: source.sendingEnabled === true,
  };
}

export function verifiedSender(value: unknown): SenderConfig | null {
  const sender = readSenderConfig(value);
  if (
    !sender ||
    sender.status !== "verified" ||
    !sender.sendingEnabled ||
    sender.fromAddress.toLowerCase().split("@")[1] !== sender.domainName.toLowerCase()
  ) {
    return null;
  }
  return sender;
}

async function resendRequest(path: string, method: "GET" | "POST", body?: unknown) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch(`${RESEND_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Resend domain request failed (${response.status}).`);
  return response.json() as Promise<unknown>;
}

function domainSnapshot(value: unknown, fromAddress: string): SenderConfig {
  const source = object(value);
  if (!source || typeof source.id !== "string" || typeof source.name !== "string") {
    throw new Error("Resend returned an invalid domain response.");
  }
  const capabilities = object(source.capabilities);
  return {
    domainId: source.id,
    domainName: source.name.toLowerCase(),
    status: typeof source.status === "string" ? source.status : "unknown",
    fromAddress,
    sendingEnabled: capabilities?.sending === "enabled",
    records:
      readSenderConfig({
        domainId: source.id,
        domainName: source.name,
        status: source.status ?? "unknown",
        fromAddress,
        sendingEnabled: capabilities?.sending === "enabled",
        records: source.records,
      })?.records ?? [],
  };
}

export async function createSenderDomain(domainName: string, fromAddress: string) {
  const response = await resendRequest("/domains", "POST", {
    name: domainName,
    capabilities: { sending: "enabled", receiving: "disabled" },
  });
  return domainSnapshot(response, fromAddress);
}

export async function refreshSenderDomain(config: SenderConfig) {
  const response = await resendRequest(`/domains/${encodeURIComponent(config.domainId)}`, "GET");
  const snapshot = domainSnapshot(response, config.fromAddress);
  if (snapshot.domainId !== config.domainId || snapshot.domainName !== config.domainName) {
    throw new Error("Resend domain identity changed.");
  }
  return snapshot;
}

export async function verifySenderDomain(config: SenderConfig) {
  await resendRequest(`/domains/${encodeURIComponent(config.domainId)}/verify`, "POST");
  return refreshSenderDomain(config);
}
