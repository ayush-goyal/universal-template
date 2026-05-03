import type { UIMessage } from "ai";

import type { RouterOutputs } from "@acme/api";

export type AiDemoContext = RouterOutputs["getAiDemoContext"];

const FALLBACK_CHUNK_SIZE = 24;

export const FALLBACK_STREAM_DELAY_MS = 18;

export function extractLatestUserText(messages: UIMessage[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!lastUserMessage) {
    return "";
  }

  return lastUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

export function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function chunkText(text: string, chunkSize = FALLBACK_CHUNK_SIZE) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return [];
  }

  const chunks: string[] = [];

  for (let index = 0; index < normalizedText.length; index += chunkSize) {
    chunks.push(normalizedText.slice(index, index + chunkSize));
  }

  return chunks;
}

export function buildLocalDemoReply({
  prompt,
  appContext,
}: {
  prompt: string;
  appContext: AiDemoContext;
}) {
  const normalizedPrompt = prompt.trim() || "the latest prompt";
  const currentUserSummary = appContext.signedIn
    ? `Signed-in user email: ${appContext.currentUserEmail ?? "unknown"}.`
    : "No authenticated web session is attached to this request.";

  return [
    "Local demo stream is active because no AI provider key is configured.",
    `You asked about: "${normalizedPrompt}".`,
    `The backend tRPC tool can currently read ${appContext.userCount} users from the database.`,
    currentUserSummary,
    "Recommended prompts:",
    appContext.recommendedPrompts.map((item, index) => `${index + 1}. ${item}`).join(" "),
    "Add AI_GATEWAY_API_KEY or OPENAI_API_KEY to switch this route from demo mode to a live model while keeping the same streaming UI.",
  ].join("\n\n");
}
