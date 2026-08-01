import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { db } from "@acme/db";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",")
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(morgan("common"));

app.use(express.json());

app.get("/", async (req, res) => {
  const userCount = await db.user.count();

  res.json({
    message: "Hello World",
    userCount: userCount,
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
  });
});

const startServices = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServices();

export default app;
