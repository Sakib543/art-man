/**
 * What a username may be. Pure, so the forms, the services and Better Auth
 * apply the same rules and none can drift from the others — the same shape as
 * `lib/auth/password-rules.ts`.
 *
 * Better Auth checks a username at **sign-in** too (its username plugin, with
 * `usernameValidator` and `maxUsernameLength` from here — `lib/auth/server.ts`).
 * So a rule wider than Better Auth's is not a kindness but a lockout: until
 * P7.17 (QA-21) these allowed a hyphen and 32 characters, Better Auth neither,
 * and a developer who renamed themselves `dev-1` could never sign in again —
 * nobody stands above that account to reset it. The Users screen only said
 * "Something went wrong".
 *
 * It is typed at a login screen by someone who may be tired, so the allowed
 * set is deliberately narrow: no spaces, no accents, nothing that looks like
 * something else. Case is not part of it — `Owner` and `owner` are the same
 * account — because a person who has to remember which one they chose has
 * been given a puzzle, not a login.
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;

/** Letters, digits, a dot and an underscore: Better Auth's own set. */
const ALLOWED = /^[a-zA-Z0-9._]+$/;

/** Only the characters — what Better Auth is given as its `usernameValidator`. */
export const usernameCharactersOk = (value: string): boolean => ALLOWED.test(value);

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
    return "Use letters, numbers, a dot or an underscore — nothing else.";
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
