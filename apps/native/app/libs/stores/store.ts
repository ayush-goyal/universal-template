import { createMMKV } from "react-native-mmkv";
import { enableMapSet } from "immer";
import superjson from "superjson";
import { PersistStorage } from "zustand/middleware";

enableMapSet();

/** Create a Zustand persist-compatible MMKV storage adapter */
export const createPersistStorage = (id: string): PersistStorage<any> => {
  const mmkv = createMMKV({
    id,
  });

  return {
    setItem: (name: string, value: any) => {
      mmkv.set(name, superjson.stringify(value));
    },
    getItem: (name: string) => {
      const value = mmkv.getString(name);
      return value ? superjson.parse(value) : null;
    },
    removeItem: (name: string) => {
      mmkv.remove(name);
    },
  };
};
