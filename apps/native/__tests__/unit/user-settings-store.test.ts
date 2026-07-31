import { createPersistStorage } from "@/libs/stores/store";
import { useUserSettingsStore } from "@/libs/stores/user-settings-store";

describe("user settings store", () => {
  beforeEach(() => {
    useUserSettingsStore.getState().reset();
  });

  it("updates and resets onboarding state", () => {
    useUserSettingsStore.getState().setHasCompletedOnboarding(true);
    expect(useUserSettingsStore.getState().hasCompletedOnboarding).toBe(true);

    useUserSettingsStore.getState().reset();
    expect(useUserSettingsStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it("serializes persisted values through MMKV", () => {
    const storage = createPersistStorage("test-settings");
    const persistedValue = {
      state: { hasCompletedOnboarding: true },
      version: 1,
    };

    storage.setItem("settings", persistedValue);

    expect(storage.getItem("settings")).toEqual(persistedValue);

    storage.removeItem("settings");
    expect(storage.getItem("settings")).toBeNull();
  });
});
