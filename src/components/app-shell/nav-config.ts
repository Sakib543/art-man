import {
  BookOpen,
  CalendarCheck,
  ChartColumn,
  ChartPie,
  Contact,
  FilePen,
  FileText,
  Grid3x3,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lock,
  PowerOff,
  Receipt,
  ScrollText,
  Settings,
  SlidersHorizontal,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  /** Roles that can see this whole section. */
  roles: readonly Role[];
  items: NavItem[];
}

/**
 * The sidebar, from the spec's screen map. To add or move a screen, edit here
 * and add its page under src/app/(app)/. Each page still checks the role itself.
 */
export const NAV: NavSection[] = [
  {
    title: "Counter",
    roles: ["owner", "manager"],
    items: [
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/worksheet", label: "Daily worksheet", icon: Grid3x3 },
      { href: "/folders", label: "Daily folders", icon: Wallet },
      { href: "/day-close", label: "Day close", icon: Lock },
      { href: "/daily-report", label: "Daily report", icon: FileText },
      { href: "/staff-khata", label: "Staff khata", icon: BookOpen },
    ],
  },
  {
    title: "Owner",
    roles: ["owner"],
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/monthly-report", label: "Monthly report", icon: ChartColumn },
      { href: "/monthly-expenses", label: "Monthly expenses", icon: CalendarCheck },
      { href: "/capital", label: "Capital / Outstanding", icon: Landmark },
      { href: "/partners", label: "Partners", icon: ChartPie },
      { href: "/staff-rates", label: "Staff & rates", icon: SlidersHorizontal },
      // Customer details and their special rates (P3.2). Owner-only, because a
      // special rate is a price and prices are the Owner's (spec §10.4).
      { href: "/customers", label: "Customers", icon: Contact },
      // Logins, not staff: the karigars never sign in. Owner and developer
      // only, and the developer role is filtered out of what the Owner sees.
      { href: "/users", label: "Users", icon: UsersRound },
    ],
  },
  {
    title: "Account",
    roles: ["owner", "manager"],
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
  /**
   * Only the developer sees this section. `canAccess` lets the developer into
   * every other section too, so they get the whole sidebar plus these three.
   */
  {
    title: "Developer",
    roles: ["developer"],
    items: [
      { href: "/developer/audit-log", label: "Audit log", icon: ScrollText },
      { href: "/developer/bills", label: "Edit a bill", icon: FilePen },
      { href: "/developer/passwords", label: "Passwords", icon: KeyRound },
      { href: "/developer/maintenance", label: "Maintenance", icon: PowerOff },
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  developer: "Developer",
  owner: "Owner",
  manager: "Manager",
};
