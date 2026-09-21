/**
 * Only Owner and Manager log in. Staff never log in; they confirm with a PIN.
 * This file is pure (no React, no database) so it is safe to import anywhere.
 */
export const ROLES = ["owner", "manager"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** Owner can do everything a manager can, plus the owner-only screens. */
export const canAccess = (role: Role, allowed: readonly Role[]): boolean =>
  allowed.includes(role);
