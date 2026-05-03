import type { LucideIcon } from "lucide-react";
import { Bell, Calendar, FolderKanban, KeyboardIcon, Search, Tag } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FolderKanban,
    title: "Projects, sections, and subtasks",
    body: "Nest projects, group with sections, and break work into bite-sized subtasks.",
  },
  {
    icon: Calendar,
    title: "Smart views",
    body: "Inbox, Today, Upcoming, Completed — always one click away.",
  },
  {
    icon: KeyboardIcon,
    title: "Quick capture",
    body: 'Type "Call mom tomorrow 9am p1 #Family" and we parse the rest.',
  },
  {
    icon: Bell,
    title: "Reminders",
    body: "Email reminders so nothing falls through, plus your inbox stays quiet.",
  },
  {
    icon: Tag,
    title: "Labels & filters",
    body: "Tag tasks across projects and slice them however you want.",
  },
  {
    icon: Search,
    title: "Cmd+K everything",
    body: "A command palette for tasks, projects, and labels — instant.",
  },
];

export function Features() {
  return (
    <section className="container mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-3">
      {FEATURES.map((f) => (
        <div key={f.title} className="bg-card rounded-2xl border p-6 shadow-sm">
          <f.icon className="text-primary size-5" />
          <h3 className="mt-3 font-medium">{f.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{f.body}</p>
        </div>
      ))}
    </section>
  );
}
