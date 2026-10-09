import type { TranscriptPiece } from "./types";

type Delta = Omit<TranscriptPiece, "text"> & { text: string };

/** Assemble out-of-order partial deltas before persisting each speaker turn. */
export class TranscriptBuffer {
  private pending: Delta[] = [];
  private seen = new Set<string>();

  async add(delta: Delta, append: (piece: TranscriptPiece) => Promise<boolean>) {
    if (this.seen.has(delta.eventKey)) return;
    this.seen.add(delta.eventKey);
    if (this.pending.length && this.pending[0]?.speaker !== delta.speaker) await this.flush(append);
    this.pending.push(delta);
  }

  async flush(append: (piece: TranscriptPiece) => Promise<boolean>) {
    if (!this.pending.length) return;
    const group = this.pending.splice(0).sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
    const first = group[0];
    if (!first) return;
    const text = group
      .map((part) => part.text)
      .join("")
      .trim();
    if (!text) return;
    await append({
      callId: first.callId,
      eventKey: group.map((part) => part.eventKey).join("|"),
      speaker: first.speaker,
      text,
      startMs: Math.min(...group.map((part) => part.startMs)),
      endMs: Math.max(...group.map((part) => part.endMs)),
    });
  }
}
