import { describe, expect, it } from "vitest";

import {
  buildLocalDemoReply,
  chunkText,
  extractLatestUserText,
  getMessageText,
} from "@/lib/ai/chat";

describe("chat helpers", () => {
  it("extracts the latest user text from UI messages", () => {
    const text = extractLatestUserText([
      {
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello there" }],
      } as any,
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Hi" }],
      } as any,
      {
        id: "3",
        role: "user",
        parts: [
          { type: "text", text: "How many" },
          { type: "text", text: " users?" },
        ],
      } as any,
    ]);

    expect(text).toBe("How many  users?");
  });

  it("joins text parts for rendering", () => {
    const messageText = getMessageText({
      id: "assistant-1",
      role: "assistant",
      parts: [
        { type: "text", text: "Streaming " },
        { type: "text", text: "response" },
      ],
    } as any);

    expect(messageText).toBe("Streaming response");
  });

  it("splits text into stable chunks", () => {
    expect(chunkText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("builds a useful local demo response", () => {
    const reply = buildLocalDemoReply({
      prompt: "Summarize the setup",
      appContext: {
        userCount: 42,
        signedIn: false,
        currentUserEmail: null,
        providerAvailability: {
          aiGateway: false,
          openai: false,
        },
        recommendedPrompts: ["Prompt A", "Prompt B"],
      },
    });

    expect(reply).toContain("Local demo stream is active");
    expect(reply).toContain("42 users");
    expect(reply).toContain("Prompt A");
  });
});
