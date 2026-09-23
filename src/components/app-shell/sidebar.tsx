import type { SessionUser } from "@/lib/auth/session";
import { BrandLockup } from "./brand-mark";
import { ROLE_LABEL } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { UserChip } from "./user-chip";

/**
 * The navy panel down the left of a wide screen (P6.1). It used to be white,
 * which left the whole app one flat sheet of near-white with nothing to
 * anchor the eye; the client chose navy.
 *
 * Below `lg` it is not rendered at all — a phone gets `MobileNav` instead,
 * which is a drawer and a bottom bar rather than the horizontal scroller of
 * nineteen items this used to collapse into.
 */
export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar print:hidden lg:flex">
      <div className="px-4 py-5">
        <BrandLockup onDark />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav role={user.role} />
      </div>

      <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
        <UserChip name={user.name} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-medium text-sidebar-active-foreground">{user.name}</p>
          <p className="truncate text-xs text-sidebar-heading">{ROLE_LABEL[user.role]}</p>
        </div>
        <SignOutButton onDark />
      </div>
    </aside>
  );
}
