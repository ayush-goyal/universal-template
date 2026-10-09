import { PgBoss } from "pg-boss";

import { db } from "@acme/db";

const QUEUE = "customer-email";
const MAX_RETRIES = 3;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function configuredSender(value: unknown) {
  const config = object(value);
  if (
    typeof config.domainId !== "string" ||
    typeof config.domainName !== "string" ||
    typeof config.fromAddress !== "string"
  ) {
    return null;
  }
  return {
    domainId: config.domainId,
    domainName: config.domainName.toLowerCase(),
    fromAddress: config.fromAddress.toLowerCase(),
  };
}

async function providerDomainVerified(domainId: string, domainName: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch(`https://api.resend.com/domains/${encodeURIComponent(domainId)}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Resend domain lookup failed (${response.status}).`);
  const domain = object(await response.json());
  const capabilities = object(domain.capabilities);
  return (
    domain.id === domainId &&
    typeof domain.name === "string" &&
    domain.name.toLowerCase() === domainName &&
    domain.status === "verified" &&
    capabilities.sending === "enabled"
  );
}

async function outcomeStillEligible(message: {
  organizationId: string;
  caseId: string;
  callId: string | null;
  eventKey: string;
  recipient: string;
}) {
  if (!message.callId) return false;
  const [call, collectionCase] = await Promise.all([
    db.callSession.findFirst({
      where: {
        id: message.callId,
        organizationId: message.organizationId,
        caseId: message.caseId,
      },
      select: { id: true, outcomeKind: true, endedAt: true },
    }),
    db.collectionCase.findFirst({
      where: { id: message.caseId, organizationId: message.organizationId },
      select: { caseData: true },
    }),
  ]);
  if (!call?.endedAt || !collectionCase) return false;
  if (
    call.outcomeKind !== "arrangement" &&
    call.outcomeKind !== "payment_claim" &&
    call.outcomeKind !== "work_quality_dispute"
  ) {
    return false;
  }
  const billingEmail = object(collectionCase.caseData).billingEmail;
  return (
    message.eventKey === `${call.id}:${call.outcomeKind}:customer-followup` &&
    typeof billingEmail === "string" &&
    billingEmail.toLowerCase() === message.recipient.toLowerCase()
  );
}

async function sendWithResend(
  message: {
    fromAddress: string;
    recipient: string;
    subject: string;
    body: string;
    eventKey: string;
  },
  displayName: string
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  const safeName =
    displayName
      .replace(/[<>\r\n"]/g, "")
      .slice(0, 100)
      .trim() || "Collections";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.eventKey,
    },
    body: JSON.stringify({
      from: `${safeName} <${message.fromAddress}>`,
      to: [message.recipient],
      subject: message.subject,
      text: message.body,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const error = new Error("Resend rejected the customer email.");
    Object.assign(error, { retryable: response.status === 429 || response.status >= 500 });
    throw error;
  }
  const result = object(await response.json());
  if (typeof result.id !== "string") throw new Error("Resend returned no message ID.");
  return result.id;
}

async function deliver(messageId: string, retryCount: number) {
  const claimed = await db.emailMessage.updateMany({
    where: {
      id: messageId,
      status: { in: ["queued", "retrying"] },
      providerMessageId: null,
    },
    data: { status: "sending", latestError: null },
  });
  if (claimed.count !== 1) return;

  const message = await db.emailMessage.findUnique({ where: { id: messageId } });
  if (!message) return;
  const settings = await db.companySettings.findUnique({
    where: { organizationId: message.organizationId },
  });
  const sender = configuredSender(settings?.senderConfig);
  if (!settings || !sender || message.fromAddress.toLowerCase() !== sender.fromAddress) {
    await db.emailMessage.update({
      where: { id: messageId },
      data: { status: "blocked_domain", latestError: "Company sender domain is unavailable." },
    });
    return;
  }
  if (!(await outcomeStillEligible(message))) {
    await db.emailMessage.update({
      where: { id: messageId },
      data: { status: "review_required", latestError: "Email outcome or recipient changed." },
    });
    return;
  }
  if (!message.subject.trim() || !message.body.trim()) {
    await db.emailMessage.update({
      where: { id: messageId },
      data: { status: "review_required", latestError: "Email content is incomplete." },
    });
    return;
  }

  try {
    if (!(await providerDomainVerified(sender.domainId, sender.domainName))) {
      await db.emailMessage.update({
        where: { id: messageId },
        data: { status: "blocked_domain", latestError: "Company sender domain is not verified." },
      });
      return;
    }
    const providerMessageId = await sendWithResend(message, settings.displayName);
    await db.emailMessage.update({
      where: { id: messageId },
      data: { status: "sent", providerMessageId, latestError: null },
    });
  } catch (error) {
    const retryable = object(error).retryable !== false;
    const willRetry = retryable && retryCount < MAX_RETRIES;
    await db.emailMessage.update({
      where: { id: messageId },
      data: {
        status: willRetry ? "retrying" : "failed",
        latestError: retryable
          ? "Temporary delivery error."
          : "Email provider rejected the message.",
      },
    });
    if (willRetry) throw new Error("Customer email delivery will retry.", { cause: error });
  }
}

async function reconcileOutbox(boss: PgBoss) {
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60_000);
  const idempotencyWindow = new Date(now.getTime() - 23 * 60 * 60_000);
  await db.emailMessage.updateMany({
    where: { status: "sending", updatedAt: { lt: stale }, createdAt: { gte: idempotencyWindow } },
    data: { status: "queued", latestError: "Retrying after interrupted delivery." },
  });
  await db.emailMessage.updateMany({
    where: { status: "sending", updatedAt: { lt: stale }, createdAt: { lt: idempotencyWindow } },
    data: {
      status: "review_required",
      latestError: "Delivery state is uncertain; review with Resend.",
    },
  });

  const queued = await db.emailMessage.findMany({
    where: { status: "queued" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  for (const message of queued) {
    await boss.send(
      QUEUE,
      { messageId: message.id },
      {
        singletonKey: message.id,
        singletonSeconds: 60,
      }
    );
  }
}

export async function startEmailDeliveryWorker(boss: PgBoss) {
  await boss.createQueue(QUEUE, {
    policy: "singleton",
    retryLimit: MAX_RETRIES,
    retryDelay: 30,
    retryBackoff: true,
  });
  const workerId = await boss.work(QUEUE, async ([job]) => {
    if (!job) return;
    const messageId = object(job.data).messageId;
    if (typeof messageId !== "string") return;
    await deliver(messageId, job.retryCount);
  });
  const timer = setInterval(() => {
    void reconcileOutbox(boss).catch(() => {
      // Keep polling; the row remains the durable source of truth.
    });
  }, 15_000);
  timer.unref();
  await reconcileOutbox(boss);
  return {
    stop: async () => {
      clearInterval(timer);
      await boss.offWork(QUEUE, { id: workerId });
    },
  };
}
