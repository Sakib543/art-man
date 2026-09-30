/**
 * An error whose message is safe and useful to show to the person using the
 * app ("Choose a staff member"). Anything else is a bug: log it and show a
 * generic message instead.
 */
export class UserError extends Error {}

/**
 * True when Postgres refused a row because a unique constraint already holds
 * that value (SQLSTATE 23505) — that constraint, when one is named. Drizzle
 * wraps the driver's error in its own (`DrizzleQueryError`, with the original
 * as `cause`), so the code is looked for down the `cause` chain as well as on
 * the error itself.
 *
 * Name the constraint when the transaction writes more than the one row it is
 * about: "already cancelled" must not be said of a clash somewhere else.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    const { code, constraint: name } = current as { code?: unknown; constraint?: unknown };
    if (code === "23505") return constraint === undefined || name === constraint;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
