import "server-only";

type Details = Record<string, unknown>;

type CallForEmail = {
  outcomeKind: string | null;
  outcomeData: unknown;
  caseId: string;
  organizationId: string;
};

type CaseForEmail = {
  customerName: string;
  invoiceNumber: string;
  outstandingAmount: { toString(): string };
  billingEmail: string | null;
  authorizedContactName: string | null;
  id: string;
  organizationId: string;
};

export type EmailFacts = {
  recipient: string;
  contactName: string;
  companyName: string;
  factBlock: string;
  suggestedSubject: string;
};

function object(value: unknown): Details {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Details) : {};
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${name} for customer email.`);
  }
  return value.trim();
}

function dollars(value: string) {
  const match = /^(\d+)(?:\.(\d{2}))?$/.exec(value);
  if (!match) throw new Error("Invalid amount for customer email.");
  return BigInt(match[1] ?? "0") * 100n + BigInt(match[2] ?? "00");
}

function money(cents: bigint) {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `$${whole.toLocaleString("en-US")}.${fraction}`;
}

export function buildEmailFacts(
  call: CallForEmail,
  collectionCase: CaseForEmail,
  companyName: string
): EmailFacts {
  if (call.caseId !== collectionCase.id || call.organizationId !== collectionCase.organizationId) {
    throw new Error("Call and case do not match.");
  }
  const outcomeData = object(call.outcomeData);
  const recipient = requiredString(collectionCase.billingEmail, "billing email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("Invalid billing email.");
  }
  const contactName = requiredString(collectionCase.authorizedContactName, "authorized contact");
  const company = requiredString(companyName, "company name");
  const invoice = requiredString(collectionCase.invoiceNumber, "invoice number");

  if (call.outcomeKind === "arrangement") {
    if (outcomeData.readBackConfirmed !== true || !Array.isArray(outcomeData.schedule)) {
      throw new Error("Arrangement confirmation is incomplete.");
    }
    const schedule = outcomeData.schedule.map((item) => {
      const entry = object(item);
      const dueDate = requiredString(entry.dueDate, "schedule date");
      const amount = requiredString(entry.amount, "schedule amount");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("Invalid schedule date.");
      const cents = dollars(amount);
      if (cents <= 0n) throw new Error("Invalid schedule amount.");
      return { dueDate, cents };
    });
    if (schedule.length === 0 || schedule.length > 24) {
      throw new Error("Invalid arrangement schedule.");
    }
    const outstanding = dollars(collectionCase.outstandingAmount.toString());
    if (schedule.reduce((sum, item) => sum + item.cents, 0n) !== outstanding) {
      throw new Error("Arrangement schedule does not match outstanding balance.");
    }
    return {
      recipient,
      contactName,
      companyName: company,
      suggestedSubject: "Your payment arrangement",
      factBlock: `This confirms the arrangement you agreed to for invoice ${invoice}. The outstanding amount remains ${money(outstanding)} until payments are received. Your agreed schedule is:\n${schedule.map((item) => `• ${item.dueDate}: ${money(item.cents)}`).join("\n")}`,
    };
  }

  if (call.outcomeKind === "payment_claim") {
    if (outcomeData.receivedPaymentVerified !== false) {
      throw new Error("Payment claim state is invalid.");
    }
    return {
      recipient,
      contactName,
      companyName: company,
      suggestedSubject: "Your payment report",
      factBlock: `You reported a payment for invoice ${invoice}. We have not verified receipt of that payment. Our team will check the claim and follow up; this message does not confirm that the balance has been paid.`,
    };
  }

  if (call.outcomeKind === "work_quality_dispute") {
    return {
      recipient,
      contactName,
      companyName: company,
      suggestedSubject: "Your service concern",
      factBlock: `You raised a concern about the service related to invoice ${invoice}. We have paused collection discussion while our service team reviews your report and follows up.`,
    };
  }

  throw new Error("This outcome does not permit customer email.");
}

const unsafeProse =
  /https?:\/\/|www\.|[\d$@]|\b(?:paid|settled|resolved|refund|guarantee|charged|collected|overdue|balance|invoice|schedule|due)\b/i;

function safeProse(value: string, field: string) {
  if (!value.trim() || value.length > 500 || unsafeProse.test(value)) {
    throw new Error(`${field} contains unsupported claims or details.`);
  }
  return value.trim();
}

export function assembleDraft(
  facts: EmailFacts,
  fragments: { subject: string; opening: string; closing: string }
) {
  const subject = safeProse(fragments.subject, "Subject");
  const opening = safeProse(fragments.opening, "Opening");
  const closing = safeProse(fragments.closing, "Closing");
  const body = `Hello ${facts.contactName},\n\n${opening}\n\n${facts.factBlock}\n\n${closing}\n\n${facts.companyName}`;
  return { subject, body };
}

export function validateDraft(facts: EmailFacts, subject: string, body: string) {
  safeProse(subject, "Subject");
  if (body.length > 5_000 || !body.startsWith(`Hello ${facts.contactName},\n\n`)) {
    throw new Error("The customer greeting is missing or the message is too long.");
  }
  if (!body.endsWith(`\n\n${facts.companyName}`)) {
    throw new Error("The company signature is missing.");
  }
  const first = body.indexOf(facts.factBlock);
  if (first < 0 || body.indexOf(facts.factBlock, first + 1) >= 0) {
    throw new Error("The verified outcome details must appear exactly once.");
  }
  const outsideFacts = body
    .slice(`Hello ${facts.contactName},\n\n`.length, -`\n\n${facts.companyName}`.length)
    .replace(facts.factBlock, "");
  if (unsafeProse.test(outsideFacts)) {
    throw new Error("The message includes unsupported claims or links.");
  }
  return { subject: subject.trim(), body: body.trim() };
}

function outputText(value: unknown): string {
  const response = object(value);
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const message = object(item);
    const content = Array.isArray(message.content) ? message.content : [];
    for (const part of content) {
      const text = object(part);
      if (text.type === "output_text" && typeof text.text === "string") return text.text;
    }
  }
  throw new Error("The draft model returned no text.");
}

export async function generateDraft(facts: EmailFacts, outcomeKind: string) {
  const fallback = () =>
    assembleDraft(facts, {
      subject: facts.suggestedSubject,
      opening: "Thank you for speaking with us.",
      closing: "Please contact our team if you have questions.",
    });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallback();

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6.1-sol",
        store: false,
        max_output_tokens: 300,
        input: [
          {
            role: "system",
            content:
              "Draft a brief, neutral customer email for an HVAC company. Return JSON only. Write a short subject, generic opening, and generic closing. Do not include names, amounts, dates, links, addresses, invoice details, payment assertions, promises, or other facts. The service adds verified details separately.",
          },
          { role: "user", content: `Outcome kind: ${outcomeKind}. Company: ${facts.companyName}.` },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "customer_email_fragments",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                subject: { type: "string" },
                opening: { type: "string" },
                closing: { type: "string" },
              },
              required: ["subject", "opening", "closing"],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Email draft request failed (${response.status}).`);
    const parsed: unknown = JSON.parse(outputText(await response.json()));
    const fragments = object(parsed);
    if (
      typeof fragments.subject !== "string" ||
      typeof fragments.opening !== "string" ||
      typeof fragments.closing !== "string"
    ) {
      throw new Error("The draft model returned incomplete text.");
    }
    return assembleDraft(facts, {
      subject: fragments.subject,
      opening: fragments.opening,
      closing: fragments.closing,
    });
  } catch {
    return fallback();
  }
}
