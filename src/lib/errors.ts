/**
 * An error whose message is safe and useful to show to the person using the
 * app ("Choose a staff member"). Anything else is a bug: log it and show a
 * generic message instead.
 */
export class UserError extends Error {}

/**
 * True when Postgres refused a row because a unique constraint already holds
 * that value (SQLSTATE 23505). Drizzle wraps the driver's error in its own
 * (`DrizzleQueryError`, with the original as `cause`), so the code is looked
 * for down the `cause` chain as well as on the error itself.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
