import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV();

/** Retrieves a string from storage. */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null;
  } catch {
    return null;
  }
}

/** Saves a string to storage. */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Retrieves and parses a JSON value from storage. */
export function load<T>(key: string): T | null {
  try {
    const value = loadString(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Saves a value as JSON to storage. */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Removes a value from storage. */
export function remove(key: string): void {
  try {
    storage.remove(key);
  } catch {
    // Ignore errors
  }
}

/** Clears all values from storage. */
export function clear(): void {
  try {
    storage.clearAll();
  } catch {
    // Ignore errors
  }
}
