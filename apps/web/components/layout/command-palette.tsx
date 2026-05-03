"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FolderKanban,
  Hash,
  Inbox,
  Search,
  Sparkles,
} from "lucide-react";
import { useTRPC } from "trpc/react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteContextValue {
  open: () => void;
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  return React.useContext(CommandPaletteContext);
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projectsQuery = useQuery(trpc.projects.list.queryOptions(undefined, { enabled: open }));
  const labelsQuery = useQuery(trpc.labels.list.queryOptions(undefined, { enabled: open }));
  const searchQuery = useQuery(
    trpc.search.query.queryOptions({ q: query }, { enabled: open && query.trim().length >= 2 })
  );

  function go(path: string) {
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  function openTask(taskId: string) {
    setOpen(false);
    setQuery("");
    const params = new URLSearchParams();
    params.set("taskId", taskId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        // Disable cmdk's built-in filter so server search results aren't hidden.
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Search tasks, projects, labels…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim() ? <CommandEmpty>No results found.</CommandEmpty> : null}

          <CommandGroup heading="Smart views">
            <CommandItem onSelect={() => go("/app/inbox")}>
              <Inbox /> Inbox
            </CommandItem>
            <CommandItem onSelect={() => go("/app/today")}>
              <CalendarDays /> Today
            </CommandItem>
            <CommandItem onSelect={() => go("/app/upcoming")}>
              <CalendarRange /> Upcoming
            </CommandItem>
            <CommandItem onSelect={() => go("/app/reminders")}>
              <Bell /> Reminders
            </CommandItem>
            <CommandItem onSelect={() => go("/app/completed")}>
              <CheckCircle2 /> Completed
            </CommandItem>
            <CommandItem onSelect={() => go("/app/search")}>
              <Search /> Search
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {(searchQuery.data?.tasks.length ?? 0) > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tasks">
                {searchQuery.data?.tasks.map((t) => (
                  <CommandItem key={t.id} onSelect={() => openTask(t.id)}>
                    <Sparkles />
                    <div className="flex flex-col">
                      <span className="font-medium">{t.title}</span>
                      {t.project ? (
                        <span className="text-muted-foreground text-xs">
                          {t.project.isInbox ? "Inbox" : t.project.name}
                        </span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {(projectsQuery.data?.length ?? 0) > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projectsQuery.data
                  ?.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
                  .map((p) => (
                    <CommandItem
                      key={p.id}
                      onSelect={() => go(p.isInbox ? "/app/inbox" : `/app/projects/${p.id}`)}
                    >
                      {p.isInbox ? <Inbox /> : <FolderKanban />}
                      {p.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          ) : null}

          {(labelsQuery.data?.length ?? 0) > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Labels">
                {labelsQuery.data
                  ?.filter((l) => !query || l.name.toLowerCase().includes(query.toLowerCase()))
                  .map((l) => (
                    <CommandItem key={l.id} onSelect={() => go(`/app/labels/${l.id}`)}>
                      <Hash /> {l.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
