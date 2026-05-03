import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";

import type { AppRouter } from "./root";
import { createORPCContext } from "./orpc";
import { appRouter } from "./root";

import "./firebase";

import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";

/**
 * Create a server-side caller for the oRPC API.
 *
 * The caller mirrors the public client interface, so consuming code can call procedures like
 * regular async functions without any HTTP transport involved.
 *
 * @example
 * const caller = createCaller({ headers: new Headers() });
 * const count = await caller.getUserCount();
 *       ^? number
 */
export const createCaller = (
  context: Parameters<typeof createORPCContext>[0]
): RouterClient<typeof appRouter> =>
  createRouterClient(appRouter, {
    context: createORPCContext(context),
  });

/**
 * Inference helpers for input types
 * @example
 * type CreateDeviceInput = RouterInputs['createDevice']
 *      ^? { fcmToken: string; platform: DevicePlatform }
 */
type RouterInputs = InferRouterInputs<typeof appRouter>;

/**
 * Inference helpers for output types
 * @example
 * type GetUserCountOutput = RouterOutputs['getUserCount']
 *      ^? number
 */
type RouterOutputs = InferRouterOutputs<typeof appRouter>;

export { appRouter, createORPCContext };
export type { AppRouter, RouterInputs, RouterOutputs };
