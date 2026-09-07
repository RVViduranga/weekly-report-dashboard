"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";

const linksForEveryone = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports", label: "My reports" },
];

const managerLinks = [
  { href: "/team", label: "Team reports" },
  { href: "/projects", label: "Projects" },
  { href: "/users", label: "Users" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const links =
    user.role === "MANAGER"
      ? [...linksForEveryone, ...managerLinks]
      : linksForEveryone;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md">
      {/*
        One row on a laptop. On a phone the links take a full-width row of
        their own and wrap underneath - done with `order` and `basis` so the
        account controls are rendered once, not duplicated per breakpoint.
      */}
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2.5 px-4 py-3 sm:px-6"
      >
        <Link
          href="/dashboard"
          className="order-1 flex items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-on-accent"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 14.5V9m4 5.5v-9m4 9V11m4 3.5V6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {/* The mark alone on a phone, so the top row fits in one line. */}
          <span className="hidden sm:inline">Weekly Reports</span>
          <span className="sr-only sm:hidden">Weekly Reports</span>
        </Link>

        <ul className="order-3 -mx-1 flex basis-full items-center gap-1 overflow-x-auto px-1 sm:order-2 sm:flex-1 sm:basis-auto">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-8 items-center rounded-md px-3 text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "bg-accent-soft font-medium text-accent-ink"
                      : "text-ink-2 hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="order-2 ml-auto flex items-center gap-3 sm:order-3 sm:ml-0">
          <ThemeToggle />

          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-2 ring-1 ring-line"
            >
              {initials(user.name)}
            </span>
            <span className="hidden leading-tight md:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-[11px] tracking-wide text-ink-3 uppercase">
                {user.role === "MANAGER" ? "Manager" : "Team member"}
              </span>
            </span>
          </div>

          <Button variant="secondary" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </nav>
    </header>
  );
}
