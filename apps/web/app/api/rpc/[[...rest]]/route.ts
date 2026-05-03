import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { appRouter } from "@acme/api";

const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("❌ oRPC failed:", error);
    }),
  ],
});

const handleRequest = async (request: Request) => {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: {
      headers: request.headers,
    },
  });

  return response ?? new Response("Not found", { status: 404 });
};

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as PUT,
  handleRequest as PATCH,
  handleRequest as DELETE,
  handleRequest as HEAD,
};
