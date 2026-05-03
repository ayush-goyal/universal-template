import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";

export function createWebAuthClient() {
  return createAuthClient({
    plugins: [
      stripeClient({
        subscription: true,
      }),
    ],
  });
}

export { stripeClient };
