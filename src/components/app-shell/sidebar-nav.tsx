"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccess, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { NAV } from "./nav-config";

/**
 * The links inside the navy panel, on a wide screen and inside the drawer
 * alike. It takes only the role (a plain string) because icon components
 * cannot be passed from a Server Component to a Client Component.
 *
 * `onNavigate` is what the drawer uses to close itself once a link is
 * followed — the sidebar passes nothing and keeps standing.
 */
export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = NAV.filter((section) => canAccess(role, section.roles));

  return (
    <nav className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-2xs font-semibold tracking-[0.09em] text-sidebar-heading uppercase">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      // 44px: the counter works this from a touch screen, and
                      // the old 40px rows were a coin toss under a thumb.
                      "group relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
                      active
                        ? "bg-sidebar-active font-semibold text-sidebar-active-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active-foreground",
                    )}
                  >
                    {/*
                      A brass rail on the active row. The tinted background
                      alone was too close to the navy to find at a glance,
                      which is the whole complaint the redesign started from.
                    */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brass-bright transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon
                      className={cn(
                        "size-4.5 shrink-0 transition-colors",
                        active ? "text-brass-bright" : "text-sidebar-heading group-hover:text-sidebar-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
