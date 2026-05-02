import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@acme/db", () => ({
  db: {
    user: { count: vi.fn().mockResolvedValue(42) },
  },
}));

vi.mock("morgan", () => ({
  default: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

// Suppress the server from actually listening during tests
vi.spyOn(console, "log").mockImplementation(() => {});

const { default: app } = await import("../index");

afterAll(() => {
  vi.restoreAllMocks();
});

describe("Express Server", () => {
  describe("GET /health", () => {
    it("returns 200 with healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "healthy");
      expect(res.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /", () => {
    it("returns 200 with message and userCount", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Hello World");
      expect(res.body).toHaveProperty("userCount", 42);
    });
  });

  describe("404 handler", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await request(app).get("/this-does-not-exist");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("message", "Endpoint not found");
    });
  });

  describe("CORS", () => {
    it("allows localhost origins in development", async () => {
      const res = await request(app).get("/health").set("Origin", "http://localhost:3000");
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });
  });

  describe("Security headers", () => {
    it("includes helmet security headers", async () => {
      const res = await request(app).get("/health");
      expect(res.headers).toHaveProperty("x-content-type-options", "nosniff");
    });
  });
});
