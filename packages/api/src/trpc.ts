/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { flattenError, ZodError } from "zod";

import type { Entitlement, PlanId } from "@acme/shared";
import { auth } from "@acme/auth";
import { resolveEntitlement } from "@acme/billing";
import { FREE_ENTITLEMENT, getPlan, isAtLeast } from "@acme/shared";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const authSession = await auth.api.getSession({
    headers: opts.headers,
  });
  const user = authSession?.user ?? null;

  // Lazy and memoised: resolving an entitlement costs two queries, and most procedures never ask.
  // Those that do ask more than once in a request share the same result.
  let entitlement: Promise<Entitlement> | undefined;
  const getEntitlement = () => {
    entitlement ??= user ? resolveEntitlement(user.id) : Promise.resolve(FREE_ENTITLEMENT);
    return entitlement;
  };

  return {
    ...opts,
    session: authSession?.session ?? null,
    user,
    getEntitlement,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? flattenError(error.cause) : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 *
 * This procedure ensures the user is authenticated before accessing the endpoint.
 * It will throw a UNAUTHORIZED error if the user is not authenticated.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Plan-gated procedure
 *
 * Authenticated *and* on at least the given plan, with `ctx.entitlement` narrowed for the handler.
 * Throws `FORBIDDEN`, which clients distinguish from `UNAUTHORIZED`: one means "sign in", the other
 * means "show the paywall".
 *
 * Gate on the server even when the UI already hides the feature. A mobile client can be out of date
 * for weeks, and the tRPC endpoint is reachable regardless of what the UI renders.
 */
export const planProcedure = (required: PlanId) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const entitlement = await ctx.getEntitlement();

    if (!isAtLeast(entitlement.plan, required)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This feature requires the ${getPlan(required).name} plan.`,
      });
    }

    return next({ ctx: { ...ctx, entitlement } });
  });

/** Shorthand for the only paid plan this template ships with. */
export const proProcedure = planProcedure("pro");
