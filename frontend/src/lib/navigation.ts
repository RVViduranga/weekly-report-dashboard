import {
  FolderKanban,
  LayoutDashboard,
  FileText,
  UsersRound,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Omitted for the first group, which needs no heading above it. */
  label?: string;
  items: NavItem[];
}

/**
 * Only routes that exist. A sidebar that lists a Settings page nobody built is
 * worse than a short sidebar.
 */
export function navigationFor(role: Role): NavGroup[] {
  const groups: NavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/reports", label: "My reports", icon: FileText },
      ],
    },
  ];

  if (role === "MANAGER") {
    groups.push({
      label: "Manage",
      items: [
        { href: "/team", label: "Team reports", icon: UsersRound },
        { href: "/projects", label: "Projects", icon: FolderKanban },
        { href: "/users", label: "Team members", icon: UserCog },
      ],
    });
  }

  return groups;
}

/** Longest match wins, so /reports/new does not resolve to /reports. */
const TITLES: [pattern: RegExp, title: string][] = [
  [/^\/dashboard$/, "Dashboard"],
  [/^\/reports$/, "My reports"],
  [/^\/reports\/new$/, "New report"],
  [/^\/reports\/[^/]+\/edit$/, "Edit report"],
  [/^\/reports\/[^/]+$/, "Report"],
  [/^\/team$/, "Team reports"],
  [/^\/team\/[^/]+$/, "Review report"],
  [/^\/projects$/, "Projects"],
  [/^\/users$/, "Team members"],
  [/^\/users\/[^/]+$/, "Team member"],
];

export function pageTitleFor(pathname: string): string {
  for (const [pattern, title] of TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return "Weekly Reports";
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/reports") {
    // /reports/[id] belongs to a manager's team view as often as to the
    // member's own list, so only the list itself lights this up.
    return pathname === "/reports" || pathname.startsWith("/reports/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
