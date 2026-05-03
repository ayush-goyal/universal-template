/**
 * Soft, calm color tokens used for project + label dots throughout the UI.
 * Keep names in sync with `packages/api/src/lib/colors.ts`.
 */
export const PROJECT_COLORS = [
  "sage",
  "sky",
  "sand",
  "lavender",
  "blush",
  "slate",
  "peach",
  "mint",
  "rose",
  "amber",
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

const COLOR_MAP: Record<
  ProjectColor,
  { bg: string; text: string; ring: string; dot: string; soft: string }
> = {
  sage: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    ring: "ring-emerald-300",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50",
  },
  sky: {
    bg: "bg-sky-100",
    text: "text-sky-800",
    ring: "ring-sky-300",
    dot: "bg-sky-500",
    soft: "bg-sky-50",
  },
  sand: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    ring: "ring-yellow-300",
    dot: "bg-yellow-500",
    soft: "bg-yellow-50",
  },
  lavender: {
    bg: "bg-violet-100",
    text: "text-violet-800",
    ring: "ring-violet-300",
    dot: "bg-violet-500",
    soft: "bg-violet-50",
  },
  blush: {
    bg: "bg-pink-100",
    text: "text-pink-800",
    ring: "ring-pink-300",
    dot: "bg-pink-500",
    soft: "bg-pink-50",
  },
  slate: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    ring: "ring-slate-300",
    dot: "bg-slate-500",
    soft: "bg-slate-50",
  },
  peach: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    ring: "ring-orange-300",
    dot: "bg-orange-500",
    soft: "bg-orange-50",
  },
  mint: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    ring: "ring-teal-300",
    dot: "bg-teal-500",
    soft: "bg-teal-50",
  },
  rose: {
    bg: "bg-rose-100",
    text: "text-rose-800",
    ring: "ring-rose-300",
    dot: "bg-rose-500",
    soft: "bg-rose-50",
  },
  amber: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-amber-300",
    dot: "bg-amber-500",
    soft: "bg-amber-50",
  },
};

export function colorClasses(color: string | undefined | null) {
  const key = (color ?? "sage") as ProjectColor;
  return COLOR_MAP[key] ?? COLOR_MAP.sage;
}

export const PRIORITY_COLORS: Record<1 | 2 | 3 | 4, { dot: string; text: string; ring: string }> = {
  1: { dot: "text-rose-500", text: "text-rose-600", ring: "ring-rose-200" },
  2: { dot: "text-orange-500", text: "text-orange-600", ring: "ring-orange-200" },
  3: { dot: "text-sky-500", text: "text-sky-600", ring: "ring-sky-200" },
  4: { dot: "text-muted-foreground", text: "text-muted-foreground", ring: "ring-border" },
};
