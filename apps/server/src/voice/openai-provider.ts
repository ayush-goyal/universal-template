import WebSocket from "ws";

import type { LiveProvider, LiveSideband } from "./types";

type ProviderOptions = { apiKey: string; fetchImpl?: typeof fetch };

export function createOpenAILiveProvider(options: ProviderOptions): LiveProvider {
  const request = options.fetchImpl ?? fetch;
  if (!options.apiKey) throw new Error("OPENAI_API_KEY is required for voice sessions");

  return {
    async createSession(offer, config) {
      const response = await request("https://api.openai.com/v1/live/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          session: {
            model: "gpt-live-1",
            store: false,
            instructions: config.instructions,
            client: {
              data_channel: {
                allowed_client_events: [],
                allowed_server_events: config.allowedServerEvents,
              },
            },
            delegation: {
              type: "responses",
              responses: {
                model: "gpt-6.1-sol",
                instructions: config.backendInstructions,
                tools: config.tools,
                parallel_tool_calls: false,
              },
            },
          },
          transport: { type: "webrtc", sdp: offer },
        }),
      });
      if (!response.ok) throw new Error(`Live session creation failed (${response.status})`);
      const body: unknown = await response.json();
      const data = body as { session?: { id?: unknown }; transport?: { sdp?: unknown } };
      if (typeof data.session?.id !== "string" || typeof data.transport?.sdp !== "string") {
        throw new Error("Live session response omitted session ID or SDP answer");
      }
      return { providerSessionId: data.session.id, sdpAnswer: data.transport.sdp };
    },

    async attachSideband(providerSessionId, handlers): Promise<LiveSideband> {
      const url = `wss://api.openai.com/v1/live/sessions/${encodeURIComponent(providerSessionId)}/attach`;
      return await new Promise((resolve, reject) => {
        const socket = new WebSocket(url, {
          headers: { Authorization: `Bearer ${options.apiKey}` },
        });
        let opened = false;
        let disconnected = false;
        const disconnect = () => {
          if (!disconnected) {
            disconnected = true;
            handlers.onDisconnect();
          }
        };
        socket.on("open", () => {
          opened = true;
          resolve({
            send(event) {
              if (socket.readyState !== WebSocket.OPEN) throw new Error("Live sideband is closed");
              socket.send(JSON.stringify(event));
            },
            close() {
              socket.close();
            },
          });
        });
        socket.on("message", (data, isBinary) => {
          // Never retain audio or its base64 event payloads.
          if (isBinary) return;
          try {
            handlers.onEvent(JSON.parse(data.toString()) as unknown);
          } catch {
            /* invalid provider frame */
          }
        });
        socket.on("error", () => {
          if (!opened) reject(new Error("Live sideband connection failed"));
          else disconnect();
        });
        socket.on("close", () => {
          if (!opened) reject(new Error("Live sideband closed during startup"));
          else disconnect();
        });
      });
    },
  };
}
