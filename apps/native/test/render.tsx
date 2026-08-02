import type { RenderOptions } from "@testing-library/react-native";
import type { ComponentType, PropsWithChildren, ReactElement, ReactNode } from "react";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react-native";

import { TRPCProvider } from "@/libs/trpc";
import { resetTrpcMocks, testTrpcClient } from "./trpc";

const activeQueryClients = new Set<QueryClient>();

notifyManager.setScheduler((callback) => callback());

afterEach(() => {
  activeQueryClients.forEach((queryClient) => queryClient.clear());
  activeQueryClients.clear();
  resetTrpcMocks();
});

export function createTestQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });
  activeQueryClients.add(queryClient);
  return queryClient;
}

type ProviderOptions = {
  provider?: ComponentType<{ children: ReactNode }>;
  queryClient?: QueryClient;
};

function createWrapper(
  queryClient: QueryClient,
  Provider?: ComponentType<{ children: ReactNode }>
) {
  return function Wrapper({ children }: PropsWithChildren) {
    const content = Provider ? <Provider>{children}</Provider> : children;

    return (
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={testTrpcClient} queryClient={queryClient}>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>{content}</SafeAreaProvider>
        </TRPCProvider>
      </QueryClientProvider>
    );
  };
}

type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & ProviderOptions;

export async function renderWithProviders(
  ui: ReactElement,
  { provider, queryClient = createTestQueryClient(), ...options }: RenderWithProvidersOptions = {}
) {
  const view = await render(ui, {
    wrapper: createWrapper(queryClient, provider),
    ...options,
  });

  return { ...view, queryClient };
}

export async function renderHookWithProviders<Result>(
  callback: () => Result,
  { provider, queryClient = createTestQueryClient() }: ProviderOptions = {}
) {
  const view = await renderHook(callback, {
    wrapper: createWrapper(queryClient, provider),
  });

  return { ...view, queryClient };
}
