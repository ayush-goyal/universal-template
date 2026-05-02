import { act, renderHook } from "@testing-library/react-native";

import { useDisclosure } from "@/hooks/useDisclosure";
import { useIsMounted } from "@/hooks/useIsMounted";

describe("useDisclosure", () => {
  it("starts closed by default", () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.open).toBe(false);
  });

  it("respects defaultOpen", () => {
    const { result } = renderHook(() => useDisclosure({ defaultOpen: true }));
    expect(result.current.open).toBe(true);
  });

  it("opens when onOpen is called", () => {
    const { result } = renderHook(() => useDisclosure());
    act(() => result.current.onOpen());
    expect(result.current.open).toBe(true);
  });

  it("closes when onClose is called", () => {
    const { result } = renderHook(() => useDisclosure({ defaultOpen: true }));
    act(() => result.current.onClose());
    expect(result.current.open).toBe(false);
  });

  it("toggles state", () => {
    const { result } = renderHook(() => useDisclosure());
    act(() => result.current.onToggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.onToggle());
    expect(result.current.open).toBe(false);
  });
});

describe("useIsMounted", () => {
  it("returns true when mounted", () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current()).toBe(true);
  });

  it("returns false after unmount", () => {
    const { result, unmount } = renderHook(() => useIsMounted());
    const isMounted = result.current;
    unmount();
    expect(isMounted()).toBe(false);
  });
});
