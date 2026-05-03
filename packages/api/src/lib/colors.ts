/**
 * Allowed color tokens for projects/labels. The web client maps these to
 * concrete Tailwind classes. Keep names in sync with apps/web/lib/colors.ts.
 */
export const COLORS = [
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

export type ColorToken = (typeof COLORS)[number];

export function isColor(value: string): value is ColorToken {
  return (COLORS as readonly string[]).includes(value);
}
