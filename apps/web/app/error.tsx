"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md">
        An unexpected error occurred. We&apos;ve been notified and are looking into it.
      </p>
      <Button variant="outline" onClick={() => (retry ?? reset)()}>
        Try again
      </Button>
    </div>
  );
}
