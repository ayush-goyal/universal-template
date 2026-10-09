import type { LiveFunctionTool, OutcomeKind } from "./types";

export const callTools: readonly LiveFunctionTool[] = [
  {
    type: "function",
    name: "get_case_context",
    description: "Get authoritative case and pinned policy context for this call.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "submit_outcome",
    description:
      "Commit one final business outcome after policy checks and any required customer confirmation. A current dispute needs the customer's exact confirming quote.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["arrangement", "payment_claim", "work_quality_dispute", "escalation"],
        },
        details: { type: "string" },
        paymentClaimDate: { type: ["string", "null"] },
        paymentMethod: { type: ["string", "null"] },
        paymentReference: { type: ["string", "null"] },
        schedule: {
          type: "array",
          items: {
            type: "object",
            properties: {
              dueDate: { type: "string" },
              amount: { type: "string" },
            },
            required: ["dueDate", "amount"],
            additionalProperties: false,
          },
        },
        policyPassage: { type: ["string", "null"] },
        policyExplanation: { type: ["string", "null"] },
        readBackConfirmed: { type: "boolean" },
        confirmationQuote: { type: ["string", "null"] },
        disputeConfirmationQuote: { type: ["string", "null"] },
      },
      required: [
        "kind",
        "details",
        "paymentClaimDate",
        "paymentMethod",
        "paymentReference",
        "schedule",
        "policyPassage",
        "policyExplanation",
        "readBackConfirmed",
        "confirmationQuote",
        "disputeConfirmationQuote",
      ],
      additionalProperties: false,
    },
  },
];

export function parseToolArguments(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || raw.length > 20_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
export function parseOutcomeKind(value: unknown): OutcomeKind | null {
  return value === "arrangement" ||
    value === "payment_claim" ||
    value === "work_quality_dispute" ||
    value === "escalation"
    ? value
    : null;
}
