import { Calendar, CheckCircle2, FolderKanban, Hash, Inbox, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lightweight illustrative "screenshot" of the app rendered as a static
 * mock so the marketing page works without uploaded images. Designed in
 * the same soft sage palette as the real product.
 */
export function Showcase() {
  return (
    <section className="container mx-auto max-w-6xl px-4 pb-16">
      <div className="bg-card overflow-hidden rounded-3xl border shadow-xl">
        <div className="grid md:grid-cols-[220px_1fr]">
          <aside className="bg-sidebar border-sidebar-border hidden border-r p-4 md:block">
            <div className="mb-4 flex items-center gap-2">
              <span className="bg-primary inline-block size-5 rounded" />
              <span className="text-sm font-semibold">Acme Tasks</span>
            </div>
            <nav className="space-y-1 text-sm">
              {[
                { icon: Inbox, label: "Inbox", active: true },
                { icon: Calendar, label: "Today" },
                { icon: Calendar, label: "Upcoming" },
                { icon: CheckCircle2, label: "Completed" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5",
                    item.active && "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </div>
              ))}
              <div className="text-muted-foreground mt-4 mb-1 px-2 text-[10px] font-medium tracking-wider uppercase">
                Projects
              </div>
              {[
                { color: "bg-emerald-500", label: "Home" },
                { color: "bg-sky-500", label: "Work" },
                { color: "bg-violet-500", label: "Side project" },
              ].map((p) => (
                <div
                  key={p.label}
                  className="text-muted-foreground flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <span className={cn("inline-block size-2 rounded-full", p.color)} />
                  {p.label}
                </div>
              ))}
              <div className="text-muted-foreground mt-4 mb-1 px-2 text-[10px] font-medium tracking-wider uppercase">
                Labels
              </div>
              {[
                { color: "text-orange-500", label: "errand" },
                { color: "text-pink-500", label: "deep-work" },
              ].map((l) => (
                <div
                  key={l.label}
                  className="text-muted-foreground flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <Hash className={cn("size-3.5", l.color)} />
                  {l.label}
                </div>
              ))}
            </nav>
          </aside>
          <main className="bg-background p-6">
            <div className="mb-4 flex items-center gap-3">
              <Inbox className="text-muted-foreground size-5" />
              <h3 className="text-lg font-semibold">Inbox</h3>
              <span className="bg-primary/10 text-primary ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                <Sparkles className="size-3" /> AI parse
              </span>
            </div>
            <div className="space-y-1">
              {[
                {
                  title: "Pay rent every 1st",
                  due: "Jun 1, 9:00 AM",
                  priorityColor: "border-rose-500",
                  label: { color: "bg-amber-100 text-amber-800", text: "@money" },
                },
                {
                  title: "Submit timesheet",
                  due: "Tomorrow, 5:00 PM",
                  priorityColor: "border-orange-500",
                },
                {
                  title: "Call mom",
                  due: "Friday",
                  priorityColor: "border-sky-500",
                  label: { color: "bg-pink-100 text-pink-800", text: "@phone" },
                },
                {
                  title: "Read book",
                  due: null,
                  priorityColor: "border-muted",
                  label: { color: "bg-emerald-100 text-emerald-800", text: "@leisure" },
                },
                {
                  title: "Buy milk",
                  due: null,
                  priorityColor: "border-muted",
                },
              ].map((row) => (
                <div
                  key={row.title}
                  className="hover:bg-accent/30 flex items-start gap-3 rounded-md px-1 py-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-block size-4 rounded-full border-2",
                      row.priorityColor
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{row.title}</div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                      {row.due ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" />
                          {row.due}
                        </span>
                      ) : null}
                      {row.label ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            row.label.color
                          )}
                        >
                          {row.label.text}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-border bg-card mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm">
              <FolderKanban className="text-primary mt-0.5 size-4" />
              <span className="text-muted-foreground">
                Add a task… try{" "}
                <span className="bg-muted inline-block rounded px-1 py-0.5 font-mono text-[11px]">
                  Pay rent every 1st 9am p1 #Home @money
                </span>
              </span>
            </div>
          </main>
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-center text-xs">
        Illustrative preview — your real workspace looks just like this.
      </p>
    </section>
  );
}
