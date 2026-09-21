import {
  BookOpen,
  CalendarCheck,
  ChartColumn,
  ChartPie,
  FileText,
  Grid3x3,
  Landmark,
  LayoutDashboard,
  Lock,
  Receipt,
  SlidersHorizontal,
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
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", manager: "Manager" };
