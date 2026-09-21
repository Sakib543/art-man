import { createHash } from "node:crypto";

/**
 * The security code sent to the owner when a day closes. It is a hash of the
 * day's figures, the day's bills and entries, and the previous day's code. If
 * anything from a closed day is changed later, recomputing gives a different
 * code, and every later day's code no longer matches either.
 */

/** JSON with keys sorted, so the same data always produces the same text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Used as the "previous code" for the very first day. */
export const FIRST_DAY_CODE = "FIRST-DAY";

export interface SecurityCodeInput {
  previousCode: string;
  businessDate: string;
  /** The day's headline figures (sale, expected, counted...). */
  figures: Record<string, number | string | null>;
  /** The day's bills with their lines, in bill-number order. */
  bills: unknown;
  /** The day's folder entries, in creation order. */
  entries: unknown;
}

/** "A3F9-7C21-0B8E": 12 hex characters, easy to read out and compare. */
export function computeSecurityCode(input: SecurityCodeInput): string {
  const hex = createHash("sha256").update(stableStringify(input)).digest("hex").slice(0, 12).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
