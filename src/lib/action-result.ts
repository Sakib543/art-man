import { UserError } from "./errors";

/**
 * What every Server Action returns, so screens handle success and failure the
 * same way. A refusal may carry the `UserError`'s `code` (P7.10).
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** Turn a thrown error into a result the screen can show. Real bugs stay generic. */
export function failure(error: unknown): { ok: false; error: string; code?: string } {
  if (error instanceof UserError) return { ok: false, error: error.message, ...(error.code ? { code: error.code } : {}) };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
