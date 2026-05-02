import Config from "@/config";

describe("Config", () => {
  it("exports a config object", () => {
    expect(Config).toBeDefined();
  });

  it("has persistNavigation setting", () => {
    expect(Config).toHaveProperty("persistNavigation");
  });

  it("has catchErrors setting", () => {
    expect(Config).toHaveProperty("catchErrors");
    expect(Config.catchErrors).toBe("always");
  });

  it("has exitRoutes", () => {
    expect(Config).toHaveProperty("exitRoutes");
    expect(Array.isArray(Config.exitRoutes)).toBe(true);
  });
});
