export type StartVoiceInput = {
  callId: string;
  caseId: string;
  actorUserId: string;
  sdpOffer: string;
};

/** Every field here comes from a tenant-checked pending CallSession, never from the browser. */
export type VoiceCall = {
  callId: string;
  organizationId: string;
  caseId: string;
  actorUserId: string;
  policyVersion: number;
  policySnapshot: string;
  companyName: string;
  callbackPhone: string | null;
  providerSessionId: string | null;
  outcomeKind: string | null;
};

export type CaseContext = {
  customerName: string;
  customerType: string;
  invoiceNumber: string;
  invoiceDate: string;
  outstandingAmount: string;
  originalAmount: string;
  currency: string;
  serviceDescription: string;
  serviceDate: string;
  priorContactSummary: string;
  existingArrangement: unknown | null;
  policyMarkdown: string;
};

export type TranscriptPiece = {
  callId: string;
  eventKey: string;
  speaker: "customer" | "assistant";
  text: string;
  startMs: number;
  endMs: number;
};
export type FinishReason = "explicit" | "connection_lost" | "startup_failed";
export type EndVoiceResult = {
  callId: string;
  outcome: string;
  connectionState: "closing" | "closed";
};

/** Implementations must lock JSON updates and recheck tenant, call and case state. */
export interface VoiceRepository {
  loadPendingCall(input: Omit<StartVoiceInput, "sdpOffer">): Promise<VoiceCall>;
  bindProviderSession(callId: string, providerSessionId: string): Promise<void>;
  markConnected(callId: string): Promise<void>;
  markClosing(callId: string): Promise<void>;
  appendTranscript(piece: TranscriptPiece): Promise<boolean>;
  loadCaseContext(callId: string): Promise<CaseContext>;
  getFunctionResult(callId: string, functionCallId: string): Promise<string | null>;
  saveFunctionResult(callId: string, functionCallId: string, result: string): Promise<void>;
  getCallForEnd(callId: string, actorUserId: string): Promise<VoiceCall | null>;
  listUnfinishedCalls(): Promise<VoiceCall[]>;
  finishCall(callId: string, reason: FinishReason): Promise<EndVoiceResult>;
}

export type OutcomeKind =
  | "arrangement"
  | "arrangement_amended"
  | "plan_check_in"
  | "discounted_payoff"
  | "payment_claim"
  | "work_quality_dispute"
  | "escalation";
export type InvokeOutcome = (input: {
  callId: string;
  organizationId: string;
  caseId: string;
  actorUserId: string;
  functionCallId: string;
  kind: OutcomeKind;
  details: Record<string, unknown>;
}) => Promise<{ status: "committed" | "rejected" | "already_committed"; spokenMessage: string }>;

export type LiveFunctionTool = {
  type: "function";
  name: string;
  description: string;
  strict: true;
  parameters: Record<string, unknown>;
};
export type LiveCreateConfig = {
  instructions: string;
  backendInstructions: string;
  tools: readonly LiveFunctionTool[];
  allowedServerEvents: readonly { type: string }[];
};
export interface LiveSideband {
  send(event: Record<string, unknown>): void;
  close(): void;
}
export interface LiveProvider {
  createSession(
    offer: string,
    config: LiveCreateConfig
  ): Promise<{ providerSessionId: string; sdpAnswer: string }>;
  attachSideband(
    providerSessionId: string,
    handlers: {
      onEvent: (event: unknown) => void;
      onDisconnect: () => void;
    }
  ): Promise<LiveSideband>;
}
