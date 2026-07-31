import type { NavigationState } from "@react-navigation/native";

import { getActiveRouteName } from "@/navigators/navigationUtilities";

describe("getActiveRouteName", () => {
  it("returns the active route from a flat state", () => {
    const state = {
      index: 1,
      routes: [
        { key: "welcome", name: "Welcome" },
        { key: "phone", name: "PhoneNumberInput" },
      ],
    } as NavigationState;

    expect(getActiveRouteName(state)).toBe("PhoneNumberInput");
  });

  it("walks nested navigation state", () => {
    const state = {
      index: 0,
      routes: [
        {
          key: "root",
          name: "MainBottomTabs",
          state: {
            index: 0,
            routes: [
              {
                key: "home-tab",
                name: "HomeTab",
                state: {
                  index: 0,
                  routes: [{ key: "home", name: "Home" }],
                },
              },
            ],
          },
        },
      ],
    } as unknown as NavigationState;

    expect(getActiveRouteName(state)).toBe("Home");
  });

  it("returns an empty string for an empty state", () => {
    const state = { index: 0, routes: [] } as unknown as NavigationState;

    expect(getActiveRouteName(state)).toBe("");
  });
});
