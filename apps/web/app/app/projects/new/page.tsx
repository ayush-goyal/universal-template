"use client";

import type { ProjectColor } from "@/lib/colors";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { colorClasses, PROJECT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface DraftTask {
  title: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  dueInDays?: number;
}

/**
 * AI-powered project setup wizard. Pro users describe a goal; the AI
 * proposes a project name + ordered task list. The user can edit the
 * proposal before persisting.
 *
 * Free users (and unauthenticated environments) see a graceful upgrade
 * pitch instead of the wizard.
 */
export default function NewProjectPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();

  const aiStatus = useQuery(trpc.ai.status.queryOptions());
  const aiAvailable = aiStatus.data?.enabled && aiStatus.data?.plan === "pro";

  const [goal, setGoal] = React.useState("");
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<ProjectColor>("sage");
  const [tasks, setTasks] = React.useState<DraftTask[] | null>(null);
  const [creating, setCreating] = React.useState(false);

  const generate = useMutation(
    trpc.ai.generateProject.mutationOptions({
      onSuccess: (plan) => {
        setName(plan.projectName);
        setTasks(plan.tasks);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const createProject = useMutation(trpc.projects.create.mutationOptions());
  const createTask = useMutation(trpc.tasks.create.mutationOptions());

  async function persist() {
    if (!name.trim() || !tasks?.length) return;
    setCreating(true);
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        color,
      });
      for (const t of tasks) {
        const dueAt =
          typeof t.dueInDays === "number"
            ? DateTime.now().plus({ days: t.dueInDays }).startOf("day").toJSDate()
            : null;
        await createTask.mutateAsync({
          title: t.title,
          description: t.description,
          projectId: project.id,
          priority: t.priority,
          dueAt,
        });
      }
      void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
      void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
      toast.success(`Created project "${project.name}"`);
      router.push(`/app/projects/${project.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create project";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <Link
        href="/app/inbox"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" /> Back
      </Link>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="text-primary size-5" /> Generate a project
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe what you want to do. We&apos;ll propose a project plan you can edit before
          creating.
        </p>
      </header>

      {!aiAvailable ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <Sparkles className="text-primary mx-auto size-6" />
          <h2 className="mt-2 text-base font-medium">AI projects are part of Pro</h2>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Pro users can describe a goal and instantly get a structured project with tasks,
            priorities, and due dates.
          </p>
          <Button asChild className="mt-4">
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Plan a 5-day trip to Lisbon for two people in October."
              className="min-h-24"
            />
          </div>
          <Button
            onClick={() => generate.mutate({ goal })}
            disabled={!goal.trim() || generate.isPending}
          >
            <Sparkles className="size-4" />
            {generate.isPending ? "Drafting plan…" : "Draft plan"}
          </Button>

          {generate.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}

          {tasks ? (
            <div className="bg-card mt-6 space-y-4 rounded-lg border p-5">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((c) => {
                    const cc = colorClasses(c);
                    const selected = c === color;
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          "ring-offset-background size-7 rounded-full ring-2 ring-offset-2 transition",
                          cc.dot,
                          selected ? "ring-foreground" : "ring-transparent"
                        )}
                        aria-label={c}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tasks</Label>
                <ul className="divide-border bg-background divide-y rounded-md border">
                  {tasks.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-3">
                      <Input
                        value={t.title}
                        onChange={(e) =>
                          setTasks((prev) => {
                            if (!prev) return prev;
                            const next = [...prev];
                            const existing = next[idx];
                            if (!existing) return prev;
                            next[idx] = { ...existing, title: e.target.value };
                            return next;
                          })
                        }
                        className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                      />
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {typeof t.dueInDays === "number" ? `+${t.dueInDays}d` : ""}
                        {t.priority && t.priority < 4 ? `  P${t.priority}` : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() =>
                          setTasks((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev))
                        }
                        aria-label="Remove task"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTasks(null);
                    setName("");
                  }}
                  disabled={creating}
                >
                  Discard
                </Button>
                <Button onClick={persist} disabled={!name.trim() || tasks.length === 0 || creating}>
                  <Check className="size-4" />
                  {creating ? "Creating…" : `Create project + ${tasks.length} tasks`}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
