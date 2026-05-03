import { StandardRPCJsonSerializer } from "@orpc/client/standard";

/**
 * Shared oRPC JSON serializer instance used by both the React Query hydration boundary on the
 * client and the per-request `QueryClient` factory on the server. Keeping it as a singleton avoids
 * recreating the serializer for every request.
 *
 * We rely on the default native type set (Date, Map, Set, BigInt, RegExp, URL, ...) rather than
 * registering any custom serializers. If the API ever returns custom classes (e.g. `Decimal` from
 * Prisma), register them here.
 */
export const orpcSerializer = new StandardRPCJsonSerializer();
