"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, MicOff, PhoneOff, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TranscriptConversation } from "./transcript-conversation";

type WorkbenchState =
  | "idle"
  | "requesting_mic"
  | "connecting"
  | "connected"
  | "ending"
  | "ended"
  | "error";
type Caption = { speaker: "customer" | "agent"; text: string };

type CreateCallResponse = {
  callId: string;
  sdpAnswer: string;
  connectionState: "connecting";
};

function readError(response: Response): Promise<string> {
  return response.json().then(
    (body: { error?: string; message?: string }) =>
      body.error ?? body.message ?? `Request failed (${response.status})`,
    () => `Request failed (${response.status})`
  );
}

export function VoiceWorkbench({ caseId, onEnded }: { caseId: string; onEnded?: () => void }) {
  const [state, setState] = useState<WorkbenchState>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [persistedTranscript, setPersistedTranscript] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const startKeyRef = useRef<string | null>(null);
  const endedNotifiedRef = useRef(false);

  function closeMedia() {
    peerRef.current?.close();
    peerRef.current = null;
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
  }

  useEffect(() => () => closeMedia(), []);

  useEffect(() => {
    if (!activeCallId || state === "ended") return;
    let mounted = true;
    async function refresh() {
      try {
        const response = await fetch(`/api/calls/${encodeURIComponent(activeCallId!)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          call?: { transcriptText?: string; connectionState?: string };
        };
        if (!mounted || !data.call) return;
        setPersistedTranscript(data.call.transcriptText ?? "");
        if (data.call.connectionState === "closed" || data.call.connectionState === "failed") {
          callIdRef.current = null;
          setState("ended");
          if (!endedNotifiedRef.current) {
            endedNotifiedRef.current = true;
            onEnded?.();
          }
        }
      } catch {
        // The next poll will retry while the browser connection remains open.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [activeCallId, onEnded, state]);

  async function start() {
    if (state !== "idle" && state !== "ended" && state !== "error") return;
    setError(null);
    setCaptions([]);
    setPersistedTranscript("");
    setActiveCallId(null);
    endedNotifiedRef.current = false;
    setMuted(false);
    callIdRef.current = null;
    setState("requesting_mic");

    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = media;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      media.getAudioTracks().forEach((track) => peer.addTrack(track, media));

      peer.ontrack = (event) => {
        if (!audioRef.current) return;
        audioRef.current.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audioRef.current.play().catch(() => {
          setError("Audio playback was blocked. Use the audio control to play the agent.");
        });
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setState("connected");
        if (peer.connectionState === "failed") {
          setError("The voice connection failed. End this call and try again.");
          setState("error");
        }
      };

      const events = peer.createDataChannel("oai-events");
      events.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as { type?: string; delta?: string };
          if (event.type === "session.started") setState("connected");
          if (
            (event.type === "session.input_transcript.delta" ||
              event.type === "session.output_transcript.delta") &&
            event.delta
          ) {
            const speaker = event.type === "session.input_transcript.delta" ? "customer" : "agent";
            setCaptions((current) => [...current.slice(-49), { speaker, text: event.delta! }]);
          }
          if (event.type === "session.closed") setState("ending");
          if (event.type === "error") setError("The voice service reported an error.");
        } catch {
          // Ignore non-JSON data-channel messages; audio continues independently.
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      setState("connecting");
      startKeyRef.current = crypto.randomUUID();
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": startKeyRef.current,
        },
        body: JSON.stringify({ caseId, sdpOffer: peer.localDescription?.sdp ?? offer.sdp }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const call = (await response.json()) as CreateCallResponse;
      callIdRef.current = call.callId;
      setActiveCallId(call.callId);
      await peer.setRemoteDescription({ type: "answer", sdp: call.sdpAnswer });
    } catch (cause) {
      closeMedia();
      const message = cause instanceof Error ? cause.message : "Could not start the call.";
      const createdCallId = callIdRef.current;
      if (createdCallId) {
        try {
          const response = await fetch(`/api/calls/${encodeURIComponent(createdCallId)}/end`, {
            method: "POST",
          });
          if (!response.ok) throw new Error(await readError(response), { cause: cause });
          setError(`${message} Closing the call before you retry.`);
          setState("ending");
        } catch {
          setError(`${message} Use End call to release this case before retrying.`);
          setState("error");
        }
      } else {
        setError(message);
        setState("error");
      }
    }
  }

  function toggleMute() {
    const next = !muted;
    mediaRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }

  async function end() {
    if (state === "ending" || state === "ended") return;
    setState("ending");
    const callId = callIdRef.current;
    closeMedia();
    try {
      if (callId) {
        const response = await fetch(`/api/calls/${encodeURIComponent(callId)}/end`, {
          method: "POST",
        });
        if (!response.ok) throw new Error(await readError(response));
      }
      if (!callId) {
        setState("ended");
        if (!endedNotifiedRef.current) {
          endedNotifiedRef.current = true;
          onEnded?.();
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not close the call.");
      setState("error");
    }
  }

  return (
    <Card className="border-border/70 w-full shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>Call workspace</CardTitle>
          <CardDescription>
            Speak as the customer. The assistant represents the HVAC company.
          </CardDescription>
        </div>
        <Badge
          variant={
            state === "error" ? "destructive" : state === "connected" ? "secondary" : "outline"
          }
        >
          {state.replaceAll("_", " ")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-xs">
          Browser demo call · no phone number is dialed
        </p>
        <div className="space-y-2">
          <p className="text-xs font-medium">Assistant audio</p>
          <audio
            ref={audioRef}
            autoPlay
            controls
            className="h-10 w-full"
            aria-label="Agent audio"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void start()}
            disabled={
              Boolean(callIdRef.current) ||
              !(["idle", "ended", "error"] as const).includes(state as "idle" | "ended" | "error")
            }
          >
            <Play className="size-4" /> Start call
          </Button>
          <Button variant="outline" onClick={toggleMute} disabled={state !== "connected"}>
            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void end()}
            disabled={state === "idle" || state === "ending" || state === "ended"}
          >
            <PhoneOff className="size-4" /> End call
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Conversation</h3>
          <div
            aria-live="polite"
            className="bg-muted/20 max-h-72 min-h-24 space-y-2 overflow-y-auto rounded-md border p-4"
          >
            {persistedTranscript ? (
              <TranscriptConversation transcriptText={persistedTranscript} />
            ) : captions.length ? (
              captions.map((caption, index) => (
                <p key={`${index}-${caption.speaker}`} className="text-sm">
                  <strong>{caption.speaker === "agent" ? "Agent" : "Customer"}:</strong>{" "}
                  {caption.text}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                The transcript will appear when the call begins.
              </p>
            )}
          </div>
        </div>
        {activeCallId && state === "ended" ? (
          <Button asChild size="sm" variant="link" className="px-0">
            <Link href="#calls">View call history below</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
