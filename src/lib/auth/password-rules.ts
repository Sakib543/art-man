/** Rules for a new login password. Pure, so the form and the server apply the same ones. */

export const MIN_PASSWORD_LENGTH = 8;

/** Returns what is wrong with a new password, or null when it is fine. */
export function checkNewPassword(next: string, current?: string): string | null {
  if (next.length < MIN_PASSWORD_LENGTH) return `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (next.length > 128) return "The new password is too long.";
  if (current !== undefined && next === current) return "The new password must be different from the current one.";
  if (/^\d+$/.test(next)) return "Use letters as well as numbers in the password.";
  return null;
}
