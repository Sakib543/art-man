/**
 * What a username may be. Pure, so the form and the server apply the same
 * rules and neither can drift from the other — the same shape as
 * `lib/auth/password-rules.ts`.
 *
 * It is typed at a login screen by someone who may be tired, so the allowed
 * set is deliberately narrow: no spaces, no accents, nothing that looks like
 * something else. Case is not part of it — `Owner` and `owner` are the same
 * account — because a person who has to remember which one they chose has
 * been given a puzzle, not a login.
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 32;

/** Letters, digits, and the three separators a username usually wants. */
const ALLOWED = /^[a-zA-Z0-9._-]+$/;

/** What is stored and matched on. Two usernames differing only in case are one. */
export const usernameKey = (value: string): string => value.trim().toLowerCase();

/** Returns what is wrong with a username, or null when it is fine. */
export function checkUsername(next: string, current?: string): string | null {
  const trimmed = next.trim();

  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `The username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return `The username must be ${MAX_USERNAME_LENGTH} characters or fewer.`;
  }
  if (!ALLOWED.test(trimmed)) {
    return "Use letters, numbers, a dot, an underscore or a hyphen — nothing else.";
  }
  // A username that is only punctuation is legal by the rule above and useless
  // as a name, so it is refused here rather than in a second, vaguer rule.
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return "The username needs at least one letter or number.";
  }
  if (current !== undefined && usernameKey(trimmed) === usernameKey(current)) {
    return "That is already your username.";
  }
  return null;
}
