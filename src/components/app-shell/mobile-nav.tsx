"use client";

import { Menu, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccess, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { BrandLockup, SalonLogo } from "@/components/salon-logo";
import { labelOf, NAV, ROLE_LABEL, type NavItem } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { UserChip } from "./user-chip";

/**
 * Navigation on a phone (P6.1).
 *
 * It used to be the sidebar, turned sideways: all nineteen links in one
 * horizontally scrolling strip, with the section headings hidden because there
 * was no room for them. Finding "Monthly expenses" meant swiping through
 * fourteen others with nothing to say where you were.
 *
 * In its place, the two halves people actually use:
 *
 * - **a bottom bar** with the four screens the counter lives in, always in the
 *   same place, reachable with a thumb;
 * - **a drawer** behind the fifth slot, holding everything with its sections
 *   intact.
 *
 * Both are hidden from `lg` up, where the navy sidebar takes over.
 */
export function MobileNav({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  /*
   * A link inside the drawer navigates without unmounting it, so the drawer
   * has to be told the page changed — including on a Back, which no click
   * handler sees. This is React's "adjust state while rendering" pattern
   * rather than an effect: an effect here would close the drawer one paint
   * after the new screen had already appeared behind it.
   */
  const [shownFor, setShownFor] = useState(pathname);
  if (pathname !== shownFor) {
    setShownFor(pathname);
    setOpen(false);
  }

  // While the drawer is over the page, the page behind it must not scroll.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const primary: NavItem[] = NAV.filter((section) => canAccess(user.role, section.roles))
    .flatMap((section) => section.items)
    .filter((item) => item.primary);

  return (
    <>
      {/* The bar across the top: what screen this is, and the way out. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-sidebar px-4 text-sidebar-active-foreground print:hidden lg:hidden">
        <SalonLogo onDark priority className="h-7 shrink-0" />
        <p className="min-w-0 flex-1 truncate font-semibold">{labelOf(pathname)}</p>
        <SignOutButton onDark />
      </header>

      {/* The drawer, and the sheet of dark behind it. */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-primary/55 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        // `inert` keeps the closed drawer's links off the tab order and away
        // from a screen reader while it is still in the tree for the slide.
        inert={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col bg-sidebar shadow-xl transition-transform duration-250 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="min-w-0 flex-1">
            <BrandLockup onDark compact />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close the menu"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-sidebar-active-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav role={user.role} onNavigate={() => setOpen(false)} />
        </div>

        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3 pb-safe">
          <UserChip name={user.name} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-medium text-sidebar-active-foreground">{user.name}</p>
            <p className="truncate text-xs text-sidebar-heading">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
      </div>

      {/* The bottom bar: the day's work, one tap away, in a fixed place. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t bg-card/95 backdrop-blur-sm pb-safe print:hidden lg:hidden"
      >
        {primary.map(({ href, label, short, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-2xs font-medium transition-colors",
                active ? "text-brass-strong" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-12 place-items-center rounded-full transition-colors",
                  active && "bg-brass-soft",
                )}
              >
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="max-w-full truncate">{short ?? label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the menu"
          aria-expanded={open}
          className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-2xs font-medium text-muted-foreground transition-colors"
        >
          <span className="grid h-7 w-12 place-items-center rounded-full">
            {open ? <Menu className="size-4.5" aria-hidden /> : <MoreHorizontal className="size-4.5" aria-hidden />}
          </span>
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}
