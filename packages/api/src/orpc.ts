/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the oRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { ORPCError, os } from "@orpc/server";

import { auth } from "@acme/auth";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * The initial context is the values supplied when invoking a procedure (e.g. via the
 * `RPCHandler.handle` call inside the Next.js route handler). Execution context is computed by
 * middleware as the request flows through the procedure pipeline.
 *
 * @see https://orpc.dev/docs/context
 */
export interface InitialContext {
  headers: Headers;
}

/**
 * Helper for tests / server-side callers that want to construct an initial context object given a
 * request `Headers` instance. Mirrors the previous `createTRPCContext` helper signature so existing
 * integrations don't have to change.
 */
export const createORPCContext = (opts: { headers: Headers }): InitialContext => ({
  headers: opts.headers,
});

/**
 * 2. INITIALIZATION
 *
 * This is where the oRPC API is initialized. We declare the initial context shape on the base
 * builder so all procedures share the same context type.
 */
const base = os.$context<InitialContext>();

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your oRPC API. You should import them in the
 * `/src/routes` directory.
 */

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your oRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data inside a
 * handler if they are logged in.
 */
export const publicProcedure = base;

/**
 * Middleware which loads the Better Auth session/user from the request headers and exposes them in
 * the execution context.
 */
const sessionMiddleware = base.middleware(async ({ context, next }) => {
  const authSession = await auth.api.getSession({
    headers: context.headers,
  });

  return next({
    context: {
      session: authSession?.session ?? null,
      user: authSession?.user ?? null,
    },
  });
});

/**
 * Middleware which enforces an authenticated user. Builds on top of `sessionMiddleware` so callers
 * get fully-typed `session` and `user` values without additional null checks.
 */
const authMiddleware = base.middleware(async ({ context, next }) => {
  const authSession = await auth.api.getSession({
    headers: context.headers,
  });

  if (!authSession?.session || !authSession.user.id) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: authSession.session,
      user: authSession.user,
    },
  });
});

/**
 * Public procedure which still exposes an (optionally `null`) session/user via the context.
 */
export const sessionProcedure = base.use(sessionMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * This procedure ensures the user is authenticated before accessing the endpoint.
 * It will throw an UNAUTHORIZED ORPCError if the user is not authenticated.
 */
export const protectedProcedure = base.use(authMiddleware);
