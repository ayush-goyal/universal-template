/**
 * The plan reserves the name `quickAddRegex.ts` for the regex-based
 * quick-add parser. The implementation lives in `./quickAdd.ts` (which is
 * also used as the AI fallback). This module re-exports it so the import
 * paths in PLAN.md keep working.
 */
export { parseQuickAdd } from "./quickAdd";
export type { QuickAddParsed } from "./quickAdd";
