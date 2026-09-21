import { Scissors } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { ROLE_LABEL } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Sidebar on wide screens, a scrolling top bar on narrow ones. */
export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex items-center gap-3 overflow-x-auto border-b bg-sidebar px-3 py-2.5 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-3.5 lg:py-[18px]">
      <div className="flex items-center gap-2.5 lg:px-2 lg:pb-4">
        <div className="grid size-9 place-items-center rounded-[10px] bg-primary text-[#e6c58f] lg:size-[38px]">
          <Scissors className="size-5" aria-hidden />
        </div>
        <div className="leading-tight whitespace-nowrap">
          <p className="text-[15px] font-semibold">Art Men&apos;s Salon</p>
          <p className="hidden text-[12.5px] text-muted-foreground lg:block">POS &amp; Accounts</p>
        </div>
      </div>

      <SidebarNav role={user.role} />

      <div className="ml-auto flex items-center gap-2.5 lg:mt-auto lg:ml-0 lg:border-t lg:px-2 lg:pt-3.5">
        <div className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#efe0c8] text-[13px] font-semibold text-brass-strong">
          {initials(user.name)}
        </div>
        <div className="hidden min-w-0 flex-1 leading-tight lg:block">
          <p className="truncate text-[13.5px] font-medium">{user.name}</p>
          <p className="text-[12.5px] text-muted-foreground">{ROLE_LABEL[user.role]}</p>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
