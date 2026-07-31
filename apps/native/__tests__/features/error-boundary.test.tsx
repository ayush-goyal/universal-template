import { Text } from "react-native";
import { renderWithProviders } from "@test/render";
import { screen, userEvent } from "@testing-library/react-native";

import { ErrorBoundary } from "@/screens/Error/ErrorBoundary";

const mockCaptureException = jest.requireMock<{
  captureException: jest.Mock;
}>("@sentry/react-native").captureException;

describe("ErrorBoundary", () => {
  it("reports a render failure and recovers when reset", async () => {
    let shouldThrow = true;
    const consoleError = jest.spyOn(console, "error").mockImplementation();

    function UnstableChild() {
      if (shouldThrow) {
        throw new Error("Render failed");
      }
      return <Text>Recovered content</Text>;
    }

    const user = userEvent.setup();
    await renderWithProviders(
      <ErrorBoundary catchErrors="always">
        <UnstableChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong!")).toBeVisible();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Render failed" }),
      expect.any(Object)
    );

    shouldThrow = false;
    await user.press(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByText("Recovered content")).toBeVisible();
    consoleError.mockRestore();
  });
});
