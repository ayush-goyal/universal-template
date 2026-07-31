import { clear, load, loadString, remove, save, saveString } from "@/libs/storage";

describe("storage", () => {
  it("round-trips strings and JSON values", () => {
    expect(saveString("token", "abc")).toBe(true);
    expect(loadString("token")).toBe("abc");

    expect(save("profile", { name: "Ada", enabled: true })).toBe(true);
    expect(load("profile")).toEqual({ name: "Ada", enabled: true });
  });

  it("removes individual values", () => {
    saveString("token", "abc");

    remove("token");

    expect(loadString("token")).toBeNull();
  });

  it("clears all values", () => {
    saveString("first", "one");
    saveString("second", "two");

    clear();

    expect(loadString("first")).toBeNull();
    expect(loadString("second")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    saveString("broken", "{not-json");

    expect(load("broken")).toBeNull();
  });
});
