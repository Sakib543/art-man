/**
 * Three people log in: the developer, the owner and the manager. Staff never
 * log in and have no PIN. This file is pure (no React, no database) so it is
 * safe to import anywhere.
 */
export const ROLES = ["developer", "owner", "manager"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/**
 * The developer stands above the owner: whatever a screen or action allows the
 * owner (or the manager) to do, the developer may do too. That is the whole of
 * the hierarchy — everywhere else a role is matched exactly.
 *
 * Two things are deliberately NOT covered by it, because they are about the
 * owner's own person rather than about permission: the owner's PIN (the
 * developer has none) and the owner-only sections of the Settings screen.
 */
export const canAccess = (role: Role, allowed: readonly Role[]): boolean =>
  role === "developer" || allowed.includes(role);

/** True for the owner and for the developer. The plain-English form of `canAccess(role, ["owner"])`. */
export const atLeastOwner = (role: Role): boolean => canAccess(role, ["owner"]);
