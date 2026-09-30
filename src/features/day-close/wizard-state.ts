/**
 * The Day close wizard's answers so far, kept in the tab's `sessionStorage`
 * so a reload does not start the close over at step 1 with every karigar
 * marked present again (backlog P7.5, QA-31). Pure: the wizard reads and
 * writes the storage, this only shapes and checks what is in it.
 */

export interface WizardState {
  v: 1;
  /** The close's id (P2.2f): kept, so a close sent before the reload is still sent under it. */
  clientId: string;
  step: number;
  present: Record<string, boolean>;
  /** Null until step 3 has been opened and pre-filled. */
  payouts: Record<string, string> | null;
  counted: string;
  reason: string;
}

/** One entry per business day, so a close left half-done is never offered for another day. */
export const wizardKey = (businessDate: string): string => `art-man:day-close:${businessDate}`;

const isRecordOf = <T>(value: unknown, isT: (item: unknown) => item is T): value is Record<string, T> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isT);
const isBoolean = (item: unknown): item is boolean => typeof item === "boolean";
const isString = (item: unknown): item is string => typeof item === "string";

/**
 * What was kept for this day, if it can be used — only for today's staff.
 * A reload on the last step goes back to the count: expected cash is worked
 * out again from the count, never kept. Anything unreadable is ignored, and
 * the close starts over as it always did.
 */
export function restoreWizard(raw: string | null, staffIds: readonly string[]): WizardState | null {
  if (!raw) return null;
  let kept: unknown;
  try {
    kept = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof kept !== "object" || kept === null) return null;
  const state = kept as Partial<WizardState>;
  if (state.v !== 1 || typeof state.clientId !== "string" || typeof state.step !== "number") return null;
  if (!isRecordOf(state.present, isBoolean) || !isString(state.counted) || !isString(state.reason)) return null;
  if (state.payouts !== null && !isRecordOf(state.payouts, isString)) return null;

  const only = <T>(record: Record<string, T>) => Object.fromEntries(staffIds.flatMap((id) => (id in record ? [[id, record[id]]] : [])));
  return {
    v: 1,
    clientId: state.clientId,
    step: Math.min(Math.max(Math.trunc(state.step), 1), 4),
    present: only(state.present),
    payouts: state.payouts === null || state.payouts === undefined ? null : only(state.payouts),
    counted: state.counted,
    reason: state.reason,
  };
}
