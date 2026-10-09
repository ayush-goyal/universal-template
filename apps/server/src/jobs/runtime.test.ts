import { describe, expect, it, vi } from "vitest";

import type { JobRegistration } from "./registry";
import { startJobRuntime } from "./runtime";

describe("Node job runtime", () => {
  it("starts workers in order and stops them once in reverse order", async () => {
    const calls: string[] = [];
    const registrations: JobRegistration[] = ["first", "second"].map((name) => ({
      name,
      start: async () => {
        calls.push(`start:${name}`);
        return {
          stop: async () => {
            calls.push(`stop:${name}`);
          },
        };
      },
    }));

    const runtime = await startJobRuntime(registrations);
    await runtime.stop();
    await runtime.stop();
    expect(calls).toEqual(["start:first", "start:second", "stop:second", "stop:first"]);
  });

  it("cleans up started workers when registration fails", async () => {
    const stop = vi.fn(async () => undefined);
    const registrations: JobRegistration[] = [
      { name: "first", start: async () => ({ stop }) },
      {
        name: "broken",
        start: async () => {
          throw new Error("startup failed");
        },
      },
    ];

    await expect(startJobRuntime(registrations)).rejects.toThrow("startup failed");
    expect(stop).toHaveBeenCalledOnce();
  });
});
