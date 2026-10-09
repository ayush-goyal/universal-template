import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenAIOutcomeVerifier } from "./verifier";

const input = {
  kind: "arrangement" as const,
  details: { schedule: [{ dueDate: "2026-10-23", amount: "100.00" }] },
  policy: "Two payments allowed.",
  outstanding: "100.00",
  existingArrangement: null,
  transcript: "[customer 0-1000ms] Yes.",
  today: "2026-10-09",
};

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI outcome verifier", () => {
  it("sends pinned policy and transcript with a strict structured verdict", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.model).toBe("gpt-5.4-mini");
      expect(body.store).toBe(false);
      expect(body.text.format.strict).toBe(true);
      expect(JSON.parse(body.input[1].content)).toEqual(input);
      return new Response(
        JSON.stringify({
          output: [
            { content: [{ type: "output_text", text: '{"approved":true,"reason":"approved"}' }] },
          ],
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await createOpenAIOutcomeVerifier("test-key")(input)).toEqual({
      approved: true,
      reason: "",
    });
  });

  it("sends the current service complaint and discounted terms to the LLM", async () => {
    const discountInput = {
      ...input,
      kind: "discounted_payoff" as const,
      details: {
        schedule: [{ dueDate: "2026-10-23", amount: "810.00" }],
        details: "Customer accepted a 10 percent service-recovery payoff.",
      },
      outstanding: "900.00",
      transcript:
        "[customer 0-1000ms] The repair service was awful, but I can pay in one go if there is a discount.\n[assistant 1000-2000ms] $810 due October 23.\n[customer 2000-3000ms] Yes, I agree to $810 on October 23.\n",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        expect(body.input[0].content).toContain("For discounted_payoff");
        expect(JSON.parse(body.input[1].content)).toEqual(discountInput);
        return new Response(
          JSON.stringify({
            output: [
              { content: [{ type: "output_text", text: '{"approved":true,"reason":"approved"}' }] },
            ],
          }),
          { status: 200 }
        );
      })
    );
    expect(await createOpenAIOutcomeVerifier("test-key")(discountInput)).toEqual({
      approved: true,
      reason: "",
    });
  });

  it("fails closed on API errors and malformed responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unavailable", { status: 503 }))
    );
    expect((await createOpenAIOutcomeVerifier("test-key")(input)).approved).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ output: [] }), { status: 200 }))
    );
    expect((await createOpenAIOutcomeVerifier("test-key")(input)).approved).toBe(false);
  });

  it("returns a fixed message for a model rejection code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              output: [
                {
                  content: [
                    {
                      type: "output_text",
                      text: '{"approved":false,"reason":"missing_confirmation"}',
                    },
                  ],
                },
              ],
            }),
            { status: 200 }
          )
      )
    );
    expect(await createOpenAIOutcomeVerifier("test-key")(input)).toEqual({
      approved: false,
      reason:
        "The customer has not agreed to the complete proposed terms. Clarify any missing or changed term, then retry.",
    });
  });
});
