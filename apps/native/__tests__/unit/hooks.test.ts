import { act, renderHook } from "@testing-library/react-native";

import { useDisclosure } from "@/hooks/useDisclosure";
import { useIsMounted } from "@/hooks/useIsMounted";

describe("useDisclosure", () => {
  it.each([
    { defaultOpen: undefined, expected: false },
    { defaultOpen: true, expected: true },
  ])("initializes open=$expected", async ({ defaultOpen, expected }) => {
    const { result } = await renderHook(() => useDisclosure({ defaultOpen }));

    expect(result.current.open).toBe(expected);
  });

  it("opens, closes, and toggles", async () => {
    const { result } = await renderHook(() => useDisclosure());

    await act(() => result.current.onOpen());
    expect(result.current.open).toBe(true);

    await act(() => result.current.onClose());
    expect(result.current.open).toBe(false);

    await act(() => result.current.onToggle());
    expect(result.current.open).toBe(true);
  });
});

describe("useIsMounted", () => {
  it("tracks mount lifecycle", async () => {
    const { result, unmount } = await renderHook(() => useIsMounted());
    const isMounted = result.current;

    expect(isMounted()).toBe(true);
    await unmount();
    expect(isMounted()).toBe(false);
  });
});
