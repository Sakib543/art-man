/**
 * What the login screen says when signing in fails.
 *
 * Two different things used to look identical here. A wrong password and a
 * database the server cannot reach both showed "Wrong username or password.",
 * so a broken deployment looked exactly like a typing mistake and stayed
 * hidden. Only a genuine credential failure gets the vague message now;
 * everything else says plainly that the fault is ours.
 *
 * Pure, so it can be tested without a browser or a server.
 */

/** Deliberately vague: it must not reveal which usernames exist. */
export const WRONG_CREDENTIALS = "Wrong username or password.";

/**
 * A closed account (backlog P1.2). The password was right — saying "wrong
 * username or password" would send the person off hunting for a typing
 * mistake that is not there, which is the exact fault P0.1 fixed.
 *
 * It reveals that the account exists, and that is the point: whoever is
 * holding it already had it.
 */
export const ACCOUNT_CLOSED = "This account has been closed. Ask the Owner to open it again.";

export interface SignInFailure {
  /** HTTP status. 0 or missing when the request never reached the server. */
  status?: number;
  /** Better Auth's code, e.g. "INVALID_USERNAME_OR_PASSWORD". */
  code?: string;
}

/** Codes that mean the person typed something wrong, not that we are broken. */
const CREDENTIAL_CODES = new Set([
  "INVALID_USERNAME_OR_PASSWORD",
  "INVALID_EMAIL_OR_PASSWORD",
  "INVALID_PASSWORD",
  "INVALID_USERNAME",
  "INVALID_EMAIL",
  "USER_NOT_FOUND",
]);

export function signInErrorMessage(failure: SignInFailure | null | undefined): string {
  if (failure?.code === "ACCOUNT_CLOSED") return ACCOUNT_CLOSED;
  if (failure?.code && CREDENTIAL_CODES.has(failure.code)) return WRONG_CREDENTIALS;

  // A missing status means the request never got a reply, same as 0.
  const status = failure?.status ?? 0;

  switch (status) {
    // No reply at all: no internet, or the server is not running.
    case 0:
      return "Cannot reach the server. Check the internet connection, then try again.";

    case 401:
    case 403:
      return WRONG_CREDENTIALS;

    case 429:
      return "Too many sign-in attempts. Wait a few minutes, then try again.";

    // Anything else is a fault on our side. Name the status so whoever is
    // called about it has something to go on.
    default:
      return `Sign-in is not working right now. This is a problem with the system, not your password (error ${status}). Please tell the developer.`;
  }
}
