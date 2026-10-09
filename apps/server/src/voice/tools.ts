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
    description: "Submit one proposed outcome for independent policy and transcript verification.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: [
            "arrangement",
            "arrangement_amended",
            "plan_check_in",
            "discounted_payoff",
            "payment_claim",
            "work_quality_dispute",
            "escalation",
          ],
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
      },
      required: [
        "kind",
        "details",
        "paymentClaimDate",
        "paymentMethod",
        "paymentReference",
        "schedule",
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
    value === "arrangement_amended" ||
    value === "plan_check_in" ||
    value === "discounted_payoff" ||
    value === "payment_claim" ||
    value === "work_quality_dispute" ||
    value === "escalation"
    ? value
    : null;
}
