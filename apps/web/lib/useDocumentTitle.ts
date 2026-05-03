"use client";

import * as React from "react";

const SUFFIX = " — Acme Tasks";

/**
 * Sets `document.title` from a client component without converting it to a
 * server component (which would require pulling out all the hooks). The
 * title is restored to the previous value on unmount so navigations don't
 * leave stale titles.
 */
export function useDocumentTitle(title: string) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.title;
    document.title = `${title}${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
