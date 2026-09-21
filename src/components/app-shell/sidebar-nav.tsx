"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccess, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { NAV } from "./nav-config";

/**
 * Client part of the sidebar: highlights the current page. It takes only the
 * role (a plain string) because icon components cannot be passed from a
 * Server Component to a Client Component.
 */
export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const sections = NAV.filter((section) => canAccess(role, section.roles));

  return (
    <nav className="flex flex-row items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-row items-center gap-1 lg:flex-col lg:items-stretch">
          <p className="hidden px-2.5 pt-4 pb-1.5 text-xs text-muted-foreground lg:block">
            {section.title}
          </p>
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-brass-soft font-medium text-brass-strong"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
