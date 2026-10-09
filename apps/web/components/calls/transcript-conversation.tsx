"use client";

import { memo } from "react";

export type TranscriptTurn = {
  speaker: "customer" | "assistant" | "unknown";
  startMs: number | null;
  endMs: number | null;
  text: string;
};

const timedTurn = /^\[(customer|assistant|agent)\s+(\d+)\s*-\s*(\d+)\s*ms\]\s*(.*)$/i;
const legacyTurn = /^\[(customer|assistant|agent)(?:\s+[^\]]*)?\]\s*(.*)$/i;
const labeledTurn = /^(customer|assistant|agent)\s*:\s*(.*)$/i;

function speaker(value: string): TranscriptTurn["speaker"] {
  return value.toLowerCase() === "customer" ? "customer" : "assistant";
}

export function parseTranscript(transcriptText: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const rawLine of transcriptText.replaceAll("\r\n", "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const header = line.trimStart();
    const timed = timedTurn.exec(header);
    if (timed) {
      turns.push({
        speaker: speaker(timed[1] ?? "assistant"),
        startMs: Number(timed[2]),
        endMs: Number(timed[3]),
        text: timed[4] ?? "",
      });
      continue;
    }
    const legacy = legacyTurn.exec(header) ?? labeledTurn.exec(header);
    if (legacy) {
      turns.push({
        speaker: speaker(legacy[1] ?? "assistant"),
        startMs: null,
        endMs: null,
        text: legacy[2] ?? "",
      });
      continue;
    }
    if (!line.trim()) {
      const previous = turns[turns.length - 1];
      if (previous?.text) previous.text += "\n";
      continue;
    }
    if (/^\[[^\]]+\]/.test(header)) {
      turns.push({ speaker: "unknown", startMs: null, endMs: null, text: header });
      continue;
    }
    const previous = turns[turns.length - 1];
    if (previous) previous.text += `${previous.text ? "\n" : ""}${line}`;
    else turns.push({ speaker: "unknown", startMs: null, endMs: null, text: line });
  }
  return turns
    .map((turn) => ({ ...turn, text: turn.text.trim() }))
    .filter((turn) => turn.text.length > 0);
}

function clock(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function relativeTime(turn: TranscriptTurn) {
  if (turn.startMs === null) return null;
  const start = clock(turn.startMs);
  if (turn.endMs === null || turn.endMs <= turn.startMs) return start;
  const end = clock(turn.endMs);
  return start === end ? start : `${start}–${end}`;
}

export const TranscriptConversation = memo(function TranscriptConversation({
  transcriptText,
  emptyMessage = "No transcript text recorded.",
}: {
  transcriptText: string;
  emptyMessage?: string;
}) {
  const turns = parseTranscript(transcriptText);
  if (!turns.length) return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;

  return (
    <ol className="space-y-3" aria-label="Call conversation">
      {turns.map((turn, index) => {
        const fromCustomer = turn.speaker === "customer";
        const unknown = turn.speaker === "unknown";
        const time = relativeTime(turn);
        return (
          <li key={index} className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm sm:max-w-[80%] ${
                fromCustomer
                  ? "bg-primary text-primary-foreground"
                  : unknown
                    ? "bg-background text-foreground border border-dashed"
                    : "bg-muted text-foreground"
              }`}
            >
              <div
                className={`mb-1 flex items-center gap-2 text-xs font-semibold ${fromCustomer ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                <span>{fromCustomer ? "Customer" : unknown ? "Transcript note" : "Assistant"}</span>
                {time ? <span className="font-normal">{time}</span> : null}
              </div>
              <p className="break-words whitespace-pre-wrap">{turn.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
});
