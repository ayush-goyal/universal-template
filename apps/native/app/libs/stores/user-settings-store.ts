import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createPersistStorage } from "./store";

interface UserSettingsStoreState {
  hasCompletedOnboarding: boolean;
}

const initialState: UserSettingsStoreState = {
  hasCompletedOnboarding: false,
};

interface UserSettingsStore extends UserSettingsStoreState {
  setHasCompletedOnboarding: (completed: boolean) => void;
  reset: () => void;
}

export const useUserSettingsStore = create<UserSettingsStore>()(
  immer(
    persist(
      (set) => ({
        ...initialState,

        setHasCompletedOnboarding: (completed) => {
          set((state) => {
            state.hasCompletedOnboarding = completed;
          });
        },

        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },
      }),
      {
        name: "user-settings-storage",
        storage: createPersistStorage("user-settings-storage"),
      }
    )
  )
);
