import * as Sentry from "@sentry/react-native";

/**
 * Logs an error to the console and reports it to Sentry in production.
 */
export const logError = (error: Error) => {
  if (__DEV__) {
    console.error(error);
  }
  Sentry.captureException(error, {
    level: "error",
  });
};
