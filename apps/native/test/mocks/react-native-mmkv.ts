type StoredValue = boolean | number | string;

const stores = new Map<string, Map<string, StoredValue>>();

function createStorage({ id = "default" }: { id?: string } = {}) {
  const values = stores.get(id) ?? new Map<string, StoredValue>();
  stores.set(id, values);

  return {
    set: jest.fn((key: string, value: StoredValue) => values.set(key, value)),
    getString: jest.fn((key: string) => {
      const value = values.get(key);
      return typeof value === "string" ? value : undefined;
    }),
    getNumber: jest.fn((key: string) => {
      const value = values.get(key);
      return typeof value === "number" ? value : undefined;
    }),
    getBoolean: jest.fn((key: string) => {
      const value = values.get(key);
      return typeof value === "boolean" ? value : undefined;
    }),
    contains: jest.fn((key: string) => values.has(key)),
    getAllKeys: jest.fn(() => [...values.keys()]),
    remove: jest.fn((key: string) => values.delete(key)),
    delete: jest.fn((key: string) => values.delete(key)),
    clearAll: jest.fn(() => values.clear()),
  };
}

export const createMMKV = jest.fn(createStorage);
export const MMKV = jest.fn(createStorage);

export function resetMMKVMock() {
  stores.clear();
}
