import { serve } from "@hono/node-server";

import app from "./app";

const port = Number(process.env.PORT ?? 3001);

serve(
  {
    fetch: app.fetch,
    port,
  },
  ({ port: listeningPort }) => {
    console.log(`Server running on http://localhost:${listeningPort}`);
  }
);
