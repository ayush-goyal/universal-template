import { PropsWithChildren } from "react";
import { StandardRPCJsonSerializer } from "@orpc/client/standard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";
import { PersistedClient, PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const serializer = new StandardRPCJsonSerializer();

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "ORPC_QUERY_CACHE",
  throttleTime: 2000,
  serialize: (data) => {
    const [json, meta] = serializer.serialize(data);
    return JSON.stringify({ json, meta });
  },
  deserialize: (cachedString) => {
    const { json, meta } = JSON.parse(cachedString) as {
      json: unknown;
      meta: Parameters<typeof serializer.deserialize>[1];
    };
    return serializer.deserialize(json, meta) as PersistedClient;
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 72 hours
      gcTime: 1000 * 60 * 60 * 72,
      // Consider data fresh for 30 minutes
      staleTime: 1000 * 60 * 30,
      // Retry failed queries 3 times
      retry: 3,
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Hash query keys deterministically through the oRPC serializer so values like Date or Map
      // produce stable cache keys.
      queryKeyHashFn(queryKey) {
        const [json, meta] = serializer.serialize(queryKey);
        return JSON.stringify({ json, meta });
      },
    },
    dehydrate: {
      shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query),
      serializeData(data) {
        const [json, meta] = serializer.serialize(data);
        return { json, meta };
      },
    },
    hydrate: {
      deserializeData(data: unknown) {
        const { json, meta } = data as {
          json: unknown;
          meta: Parameters<typeof serializer.deserialize>[1];
        };
        return serializer.deserialize(json, meta);
      },
    },
  },
});

export const ORPCProvider = (props: PropsWithChildren<{}>) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
      }}
    >
      {props.children}
    </PersistQueryClientProvider>
  );
};
