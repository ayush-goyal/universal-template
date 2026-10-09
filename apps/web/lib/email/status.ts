import "server-only";

export async function retrieveResendEmailStatus(providerMessageId: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch(
    `https://api.resend.com/emails/${encodeURIComponent(providerMessageId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!response.ok) throw new Error(`Resend status request failed (${response.status}).`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("last_event" in body)) {
    throw new Error("Resend returned an invalid email response.");
  }
  const lastEvent = body.last_event;
  if (typeof lastEvent !== "string") throw new Error("Resend returned an invalid email status.");
  if (lastEvent === "delivered") return "delivered";
  if (["bounced", "complained", "failed", "delivery_failed"].includes(lastEvent)) {
    return "delivery_failed";
  }
  return "sent";
}
