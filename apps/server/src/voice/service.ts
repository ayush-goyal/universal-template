import type {
  EndVoiceResult,
  InvokeOutcome,
  LiveProvider,
  LiveSideband,
  StartVoiceInput,
  VoiceCall,
  VoiceRepository,
} from "./types";
import { initialLiveConfig } from "./prompt";
import { parseOutcomeKind, parseToolArguments } from "./tools";
import { TranscriptBuffer } from "./transcript";

type ActiveSession = {
  call: VoiceCall;
  sideband: LiveSideband | null;
  transcript: TranscriptBuffer;
  queue: Promise<void>;
  closed: boolean;
  toolResponses: Set<string>;
  closeRequested: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toolCall(event: Record<string, unknown>) {
  const inner = event.type === "response.event" ? record(event.event) : event;
  if (inner?.type !== "response.output_item.done") return null;
  const item = record(inner.item);
  if (
    item?.type !== "function_call" ||
    typeof item.call_id !== "string" ||
    typeof item.name !== "string"
  )
    return null;
  return {
    callId: item.call_id,
    name: item.name,
    arguments: item.arguments,
    responseId: inner.response_id,
  };
}

export class VoiceSessionService {
  private active = new Map<string, ActiveSession>();

  constructor(
    private readonly deps: {
      repository: VoiceRepository;
      provider: LiveProvider;
      invokeOutcome: InvokeOutcome;
    }
  ) {}

  async start(input: StartVoiceInput): Promise<{ callId: string; sdpAnswer: string }> {
    const call = await this.deps.repository.loadPendingCall({
      callId: input.callId,
      caseId: input.caseId,
      actorUserId: input.actorUserId,
    });
    if (this.active.has(call.callId)) throw new Error("Call is already active");
    const context = await this.deps.repository.loadCaseContext(call.callId);
    const config = initialLiveConfig(call.companyName, context, call.callbackPhone);
    let state: ActiveSession | null = null;
    try {
      const created = await this.deps.provider.createSession(input.sdpOffer, config);
      await this.deps.repository.bindProviderSession(call.callId, created.providerSessionId);
      state = {
        call: { ...call, providerSessionId: created.providerSessionId },
        sideband: null,
        transcript: new TranscriptBuffer(),
        queue: Promise.resolve(),
        closed: false,
        toolResponses: new Set(),
        closeRequested: false,
      };
      this.active.set(call.callId, state);
      state.sideband = await this.deps.provider.attachSideband(created.providerSessionId, {
        onEvent: (event) => this.enqueue(state!, () => this.handleEvent(state!, event)),
        onDisconnect: () => this.enqueue(state!, () => this.handleDisconnect(state!)),
      });
      if (state.closed) throw new Error("Live session closed during startup");
      await this.deps.repository.markConnected(call.callId);
      return { callId: call.callId, sdpAnswer: created.sdpAnswer };
    } catch (error) {
      if (state) {
        this.active.delete(call.callId);
        state.sideband?.close();
      }
      await this.deps.repository.finishCall(call.callId, "startup_failed");
      throw error;
    }
  }

  async end(callId: string, actorUserId: string): Promise<EndVoiceResult> {
    const call = await this.deps.repository.getCallForEnd(callId, actorUserId);
    if (!call) throw new Error("Call not found or actor is not authorized");
    const state = this.active.get(callId);
    if (!state || state.closed) return this.deps.repository.finishCall(callId, "explicit");
    state.closeRequested = true;
    await this.deps.repository.markClosing(callId);
    state.sideband?.send({ type: "session.close" });
    setTimeout(() => this.enqueue(state, () => this.finish(state, "explicit")), 5_000);
    // Repeated end requests remain idempotent. The provider's session.closed event finalizes it.
    return { callId, outcome: call.outcomeKind ?? "no_outcome", connectionState: "closing" };
  }

  /** Call once on Node startup, after the repository and provider are ready. */
  async recoverUnfinished() {
    for (const call of await this.deps.repository.listUnfinishedCalls()) {
      if (!call.providerSessionId) {
        await this.deps.repository.finishCall(call.callId, "connection_lost");
        continue;
      }
      const state: ActiveSession = {
        call,
        sideband: null,
        transcript: new TranscriptBuffer(),
        queue: Promise.resolve(),
        closed: false,
        toolResponses: new Set(),
        closeRequested: false,
      };
      this.active.set(call.callId, state);
      try {
        state.sideband = await this.deps.provider.attachSideband(call.providerSessionId, {
          onEvent: (event) => this.enqueue(state, () => this.handleEvent(state, event)),
          onDisconnect: () => this.enqueue(state, () => this.handleDisconnect(state)),
        });
      } catch {
        this.active.delete(call.callId);
        await this.deps.repository.finishCall(call.callId, "connection_lost");
      }
    }
  }

  async shutdown() {
    for (const state of this.active.values()) {
      try {
        state.sideband?.send({ type: "session.close" });
      } catch {
        /* already disconnected */
      }
      state.sideband?.close();
    }
  }

  private enqueue(state: ActiveSession, operation: () => Promise<void>) {
    state.queue = state.queue.then(operation).catch(() => {
      // Keep the event queue alive; an invalid provider event must not expose private data.
    });
  }

  private async handleEvent(state: ActiveSession, raw: unknown) {
    if (state.closed) return;
    const event = record(raw);
    if (!event || typeof event.type !== "string") return;
    if (
      event.type === "session.input_transcript.delta" ||
      event.type === "session.output_transcript.delta"
    ) {
      const delta = event.delta;
      if (typeof delta !== "string" || !delta || typeof event.event_id !== "string") return;
      const speaker = event.type === "session.input_transcript.delta" ? "customer" : "assistant";
      const start = Number(event.start_ms);
      const end = Number(event.end_ms);
      await state.transcript.add(
        {
          callId: state.call.callId,
          eventKey: `${state.call.providerSessionId}:${event.event_id}`,
          speaker,
          text: delta,
          startMs: Number.isFinite(start) ? start : 0,
          endMs: Number.isFinite(end) ? end : 0,
        },
        (piece) => this.deps.repository.appendTranscript(piece)
      );
      return;
    }
    const functionItem = toolCall(event);
    if (functionItem) {
      let result: string;
      try {
        result = await this.handleFunction(
          state,
          functionItem.callId,
          functionItem.name,
          functionItem.arguments
        );
      } catch {
        result = JSON.stringify({
          status: "unavailable",
          reason: "The server action could not be completed. Ask the caller to contact staff.",
        });
      }
      state.sideband?.send({
        type: "response.item.create",
        item: {
          type: "function_call_output",
          call_id: functionItem.callId,
          output: result,
        },
      });
      if (typeof functionItem.responseId === "string")
        state.toolResponses.add(functionItem.responseId);
      else state.toolResponses.add("pending");
      return;
    }
    if (event.type === "response.event" || event.type === "response.completed") {
      const inner = event.type === "response.event" ? record(event.event) : event;
      if (inner?.type === "response.completed") {
        await state.transcript.flush((piece) => this.deps.repository.appendTranscript(piece));
        const response = record(inner.response);
        const responseId = typeof response?.id === "string" ? response.id : "pending";
        if (
          state.toolResponses.delete(responseId) ||
          state.toolResponses.delete("pending") ||
          state.toolResponses.size > 0
        ) {
          state.toolResponses.clear();
          state.sideband?.send({ type: "response.create" });
        }
      }
      return;
    }
    if (event.type === "session.closed") {
      await this.finish(state, state.closeRequested ? "explicit" : "connection_lost");
    }
  }

  private async handleFunction(
    state: ActiveSession,
    functionCallId: string,
    name: string,
    rawArguments: unknown
  ): Promise<string> {
    const { call } = state;
    await state.transcript.flush((piece) => this.deps.repository.appendTranscript(piece));
    const existing = await this.deps.repository.getFunctionResult(call.callId, functionCallId);
    if (existing !== null) return existing;
    const args = parseToolArguments(rawArguments);
    let output: Record<string, unknown>;
    if (!args) output = { status: "rejected", reason: "Invalid tool arguments" };
    else if (name === "get_case_context") {
      output = { status: "ok", context: await this.deps.repository.loadCaseContext(call.callId) };
    } else if (name === "submit_outcome") {
      const kind = parseOutcomeKind(args.kind);
      if (!kind || typeof args.details !== "string") {
        output = { status: "rejected", reason: "Invalid outcome input" };
      } else {
        output = await this.deps.invokeOutcome({
          callId: call.callId,
          organizationId: call.organizationId,
          caseId: call.caseId,
          actorUserId: call.actorUserId,
          functionCallId,
          kind,
          details: args,
        });
      }
    } else output = { status: "rejected", reason: "Unknown tool" };
    const serialized = JSON.stringify(output);
    await this.deps.repository.saveFunctionResult(call.callId, functionCallId, serialized);
    return serialized;
  }

  private async handleDisconnect(state: ActiveSession) {
    if (state.closed) return;
    await this.finish(state, state.closeRequested ? "explicit" : "connection_lost");
  }

  private async finish(state: ActiveSession, reason: "explicit" | "connection_lost") {
    if (state.closed) return;
    await state.transcript.flush((piece) => this.deps.repository.appendTranscript(piece));
    await this.deps.repository.finishCall(state.call.callId, reason);
    state.closed = true;
    this.active.delete(state.call.callId);
    state.sideband?.close();
  }
}
