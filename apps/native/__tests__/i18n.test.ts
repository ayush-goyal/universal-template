import en from "@/i18n/en";

describe("i18n translations", () => {
  it("has common translations", () => {
    expect(en.common).toBeDefined();
    expect(en.common.ok).toBe("Ok");
    expect(en.common.cancel).toBe("Cancel");
    expect(en.common.back).toBe("Back");
  });

  it("english translations object is not empty", () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });
});
