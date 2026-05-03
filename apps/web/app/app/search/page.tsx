"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Hash, Search as SearchIcon } from "lucide-react";
import { useTRPC } from "trpc/react";

import { TaskRow } from "@/components/tasks/TaskRow";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const trpc = useTRPC();
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounced(q, 200);

  const results = useQuery(
    trpc.search.query.queryOptions({ q: debouncedQ }, { enabled: debouncedQ.length >= 2 })
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <SearchIcon className="text-muted-foreground size-6" />
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      </header>
      <Input
        placeholder="Search tasks, projects, labels…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-6"
      />

      {debouncedQ.length < 2 ? (
        <p className="text-muted-foreground text-sm">Type at least 2 characters to search.</p>
      ) : results.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {results.data?.tasks.length ? (
            <section>
              <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Tasks ({results.data.tasks.length})
              </h2>
              <ul>
                {results.data.tasks.map((t) => (
                  <li key={t.id}>
                    <TaskRow
                      task={{
                        ...t,
                        _count: { comments: 0, children: 0, reminders: 0 },
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.data?.projects.length ? (
            <section>
              <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Projects ({results.data.projects.length})
              </h2>
              <ul className="space-y-1">
                {results.data.projects.map((p) => {
                  const cc = colorClasses(p.color);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/app/projects/${p.id}`}
                        className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2"
                      >
                        <FolderKanban className="text-muted-foreground size-4" />
                        <span className={cn("inline-block size-2.5 rounded-full", cc.dot)} />
                        <span>{p.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {results.data?.labels.length ? (
            <section>
              <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Labels ({results.data.labels.length})
              </h2>
              <ul className="space-y-1">
                {results.data.labels.map((l) => {
                  const cc = colorClasses(l.color);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/app/labels/${l.id}`}
                        className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2"
                      >
                        <Hash className={cn("size-4", cc.dot.replace("bg-", "text-"))} />
                        <span>{l.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {!results.data?.tasks.length &&
          !results.data?.projects.length &&
          !results.data?.labels.length ? (
            <p className="text-muted-foreground text-sm">No matches.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
