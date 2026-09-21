/**
 * An error whose message is safe and useful to show to the person using the
 * app ("Choose a staff member"). Anything else is a bug: log it and show a
 * generic message instead.
 */
export class UserError extends Error {}
