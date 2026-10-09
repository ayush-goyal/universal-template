import { Hono } from "hono";
import { z } from "zod";

import type { InvokeOutcome, LiveProvider, VoiceRepository } from "./types";
import { invokePrismaOutcome } from "../outcomes";
import { requireServiceAuth } from "../service-auth";
import { createOpenAILiveProvider } from "./openai-provider";
import { createPrismaVoiceRepository } from "./repository";
import { VoiceSessionService } from "./service";

const startSchema = z
  .object({
    callId: z.string().min(1).max(128),
    caseId: z.string().min(1).max(128),
    actorUserId: z.string().min(1).max(128),
    sdpOffer: z.string().min(1).max(250_000),
  })
  .strict();

/** Mount at /internal/voice; authentication is applied inside this router as defense in depth. */
export function createVoiceRouter(service: VoiceSessionService) {
  const router = new Hono<{ Bindings: { HONO_SERVICE_TOKEN?: string } }>();
  router.use("*", requireServiceAuth);
  router.post("/sessions", async (c) => {
    const parsed = startSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ message: "Invalid voice session request" }, 400);
    try {
      const created = await service.start(parsed.data);
      return c.json(created, 201);
    } catch {
      return c.json({ message: "Could not start voice session" }, 409);
    }
  });
  router.post("/sessions/:callId/end", async (c) => {
    const callId = c.req.param("callId");
    const parsed = z
      .object({ actorUserId: z.string().min(1).max(128) })
      .strict()
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success || !callId || callId.length > 128)
      return c.json({ message: "Invalid end request" }, 400);
    try {
      return c.json(await service.end(callId, parsed.data.actorUserId));
    } catch {
      return c.json({ message: "Call not found or unavailable" }, 404);
    }
  });
  return router;
}

export function createVoiceRuntime(deps: {
  repository: VoiceRepository;
  provider: LiveProvider;
  invokeOutcome: InvokeOutcome;
}) {
  const service = new VoiceSessionService(deps);
  return { service, router: createVoiceRouter(service) };
}

/** Node-only convenience factory. Keep provider credentials out of browser routes. */
export function createPrismaVoiceRuntime(apiKey: string) {
  return createVoiceRuntime({
    repository: createPrismaVoiceRepository(),
    provider: createOpenAILiveProvider({ apiKey }),
    invokeOutcome: invokePrismaOutcome,
  });
}
