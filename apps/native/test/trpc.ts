import type { TRPCLink } from "@trpc/client";
import { createTRPCClient, TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";

import type { AppRouter } from "@acme/api";

/**
 * A tRPC client that answers from a map instead of the network, so screens and hooks that fetch can
 * be rendered in Jest without mocking `@/libs/trpc` itself.
 *
 * Register answers with `mockTrpc("getEntitlement", …)` before rendering, and assert on what the
 * component sent with `trpcCalls`. Unregistered procedures reject rather than hang, so a missing
 * mock shows up as a clear error instead of a timeout.
 *
 * `test/render.tsx` wires the client in and clears the registry after every test.
 */
export interface TrpcCall {
  path: string;
  type: "query" | "mutation" | "subscription";
  input: unknown;
}

/** Every operation the client has been asked to perform, in order. */
export const trpcCalls: TrpcCall[] = [];

type Responder = (input: unknown) => unknown;

const responders = new Map<string, Responder>();

/** Answer `path` with `data`, or with the result of calling it on the procedure's input. */
export function mockTrpc(path: string, data: unknown) {
  responders.set(path, typeof data === "function" ? (data as Responder) : () => data);
}

export function resetTrpcMocks() {
  responders.clear();
  trpcCalls.length = 0;
}

const mockLink: TRPCLink<AppRouter> = () => {
  return ({ op }) =>
    observable((observer) => {
      trpcCalls.push({ path: op.path, type: op.type, input: op.input });
      const responder = responders.get(op.path);

      if (!responder) {
        observer.error(
          new TRPCClientError(`No tRPC mock registered for "${op.path}". Call mockTrpc() first.`)
        );
        return;
      }

      try {
        observer.next({ result: { data: responder(op.input) } });
        observer.complete();
      } catch (error) {
        observer.error(TRPCClientError.from(error as Error));
      }
    });
};

export const testTrpcClient = createTRPCClient<AppRouter>({ links: [mockLink] });
