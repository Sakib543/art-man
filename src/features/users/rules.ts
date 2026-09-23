import type { Role } from "@/lib/auth/roles";

/**
 * Who may do what to whom on the Users screen (backlog P1.2). Pure, so the
 * rules can be tested without a database and the same function guards both the
 * screen and the Server Action — the screen hides what it cannot do, the
 * action refuses it, and neither can drift from the other.
 */

/** An account, as much of one as these rules need. */
export interface UserSummary {
  id: string;
  role: Role;
  active: boolean;
}

/** Who is doing the managing. */
export interface Viewer {
  id: string;
  role: Role;
}

/**
 * Which accounts a viewer is shown. The client asked that the Owner and the
 * Manager see no sign the developer role exists, so developer accounts are not
 * merely read-only for the Owner — they are absent.
 */
export function visibleRoles(viewer: Role): Role[] {
  return viewer === "developer" ? ["developer", "owner", "manager"] : ["owner", "manager"];
}

/**
 * Which kinds of account a viewer may create. The Owner may create another
 * Owner — the client's *"an old admin should be able to create a 3rd admin"* —
 * but never a developer, which is not offered and would be refused anyway.
 */
export function creatableRoles(viewer: Role): Role[] {
  if (viewer === "developer") return ["developer", "owner", "manager"];
  if (viewer === "owner") return ["owner", "manager"];
  return [];
}

/** Why this account is not the viewer's to manage, or null. */
function outOfReach(viewer: Viewer, target: UserSummary): string | null {
  return visibleRoles(viewer.role).includes(target.role) ? null : "That account is not yours to manage.";
}

/** Why the viewer may not create this kind of account, or null. */
export function checkCreate(viewer: Viewer, role: Role): string | null {
  return creatableRoles(viewer.role).includes(role) ? null : "You cannot create that kind of account.";
}

/**
 * Why the viewer may not set this password, or null.
 *
 * **Setting somebody else's password is the developer's alone** — the client's
 * decision of 2026-09-23. The Owner used to be able to reset the Manager, both
 * here and from Settings, and no longer can.
 *
 * The cost is worth writing down: if the Owner or the Manager forgets their
 * password and the developer cannot be reached, nobody in the salon can let
 * them back in. That was the trade the client chose.
 *
 * The refusal does not mention the developer. The Owner and the Manager are
 * not shown that the role exists (see `visibleRoles`), and an error message is
 * a poor place to break that.
 *
 * Your own password is never set here either way, because a reset ends every
 * session and would sign you out mid-click. Settings asks for your current
 * password and keeps this session alive — except for the developer, for whom
 * that is no use if they have forgotten it and above whom nobody stands, so
 * the Passwords screen lets that one account set its own.
 */
export function checkResetPassword(viewer: Viewer, target: UserSummary): string | null {
  if (viewer.role !== "developer") return "That password is not yours to set. Ask whoever maintains the system.";
  if (target.id === viewer.id) return "Change your own password on the Passwords screen, not here.";
  return outOfReach(viewer, target);
}

/**
 * Why the viewer may not open or close this account, or null.
 *
 * `activeOwners` is how many Owner accounts are currently open. Closing the
 * last one would leave nobody who can open it again — the developer could, but
 * the salon does not know that account exists.
 */
export function checkSetActive(
  viewer: Viewer,
  target: UserSummary,
  next: boolean,
  activeOwners: number,
): string | null {
  if (target.id === viewer.id) return "You cannot close your own account.";

  const reach = outOfReach(viewer, target);
  if (reach) return reach;

  if (target.active === next) return next ? "That account is already open." : "That account is already closed.";
  if (!next && target.role === "owner" && activeOwners <= 1) {
    return "This is the last open Owner account. Make another Owner first.";
  }
  return null;
}
