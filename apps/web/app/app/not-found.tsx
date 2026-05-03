import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-full">
        <Search className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">We couldn&apos;t find that</h1>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">
        That page or item doesn&apos;t exist. Try the inbox or jump to search.
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/app/search">Search</Link>
        </Button>
        <Button asChild>
          <Link href="/app/inbox">Back to Inbox</Link>
        </Button>
      </div>
    </div>
  );
}
