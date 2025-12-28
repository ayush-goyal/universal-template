import type { ClassValue } from "clsx";
import { Linking } from "react-native";
import * as Sentry from "@sentry/react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

/**
 * Helper for opening a give URL in an external browser.
 */
export function openLinkInBrowser(url: string) {
  Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url));
}
