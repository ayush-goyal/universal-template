import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  FolderKanban,
  KeyboardIcon,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

import { Logo } from "@/components/logos/Logo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="text-primary size-7" />
          <span className="text-lg font-semibold tracking-tight">Acme Tasks</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 transition"
          >
            Pricing
          </Link>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/sign-in">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="container mx-auto max-w-4xl px-4 py-20 text-center">
        <span className="bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          <Sparkles className="text-primary size-3" />
          Now with AI quick-add and Plan my day
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
          The calm to-do list for{" "}
          <span className="text-primary">people who actually finish things</span>.
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base md:text-lg">
          Acme Tasks is a soft, modern Todoist clone built for consumers and professionals. Capture,
          organize, and ship — with reminders, AI, and a delightful design.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Start free <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-3">
        <Feature
          icon={FolderKanban}
          title="Projects, sections, and subtasks"
          body="Nest projects, group with sections, and break work into bite-sized subtasks."
        />
        <Feature
          icon={Calendar}
          title="Smart views"
          body="Inbox, Today, Upcoming, Completed — always one click away."
        />
        <Feature
          icon={KeyboardIcon}
          title="Quick capture"
          body='Type "Call mom tomorrow 9am p1 #Family" and we parse the rest.'
        />
        <Feature
          icon={Bell}
          title="Reminders"
          body="Email reminders so nothing falls through, plus your inbox stays quiet."
        />
        <Feature
          icon={Tag}
          title="Labels & filters"
          body="Tag tasks across projects and slice them however you want."
        />
        <Feature
          icon={Search}
          title="Cmd+K everything"
          body="A command palette for tasks, projects, and labels — instant."
        />
      </section>

      <section className="container mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Made for the way you actually work.
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl">
          Soft sage tones, calm typography, keyboard-first interactions. The opposite of another
          shouty productivity app.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/sign-up">
              <CheckCircle2 className="size-4" /> Start free
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="text-muted-foreground container mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs">
          <div className="flex items-center gap-2">
            <Logo className="text-primary size-5" />
            <span>Acme Tasks</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card rounded-2xl border p-6 shadow-sm">
      <Icon className="text-primary size-5" />
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{body}</p>
    </div>
  );
}
