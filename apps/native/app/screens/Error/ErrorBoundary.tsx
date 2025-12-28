import { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react-native";

import { ErrorDetails } from "./ErrorDetails";

interface Props {
  children: ReactNode;
  catchErrors: "always" | "dev" | "prod" | "never";
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches React errors and reports them to Sentry.
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!this.isEnabled()) return;

    this.setState({ error, errorInfo });

    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  // Reset the error back to null
  resetError = () => {
    this.setState({ error: null, errorInfo: null });
  };

  // To avoid unnecessary re-renders
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>): boolean {
    return nextState.error !== this.state.error;
  }

  // Only enable if we're catching errors in the right environment
  isEnabled(): boolean {
    return (
      this.props.catchErrors === "always" ||
      (this.props.catchErrors === "dev" && __DEV__) ||
      (this.props.catchErrors === "prod" && !__DEV__)
    );
  }

  // Render an error UI if there's an error; otherwise, render children
  render() {
    return this.isEnabled() && this.state.error ? (
      <ErrorDetails
        onReset={this.resetError}
        error={this.state.error}
        errorInfo={this.state.errorInfo}
      />
    ) : (
      this.props.children
    );
  }
}
