"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/app] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-destructive/10 text-destructive inline-flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">
        We hit an unexpected error. You can try again, or head back to your inbox.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/app/inbox">Back to Inbox</Link>
        </Button>
      </div>
      {error.digest ? (
        <p className="text-muted-foreground mt-4 text-xs">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
