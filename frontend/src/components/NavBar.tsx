"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const linksForEveryone = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports", label: "My reports" },
];

const managerLinks = [
  { href: "/team", label: "Team reports" },
  { href: "/projects", label: "Projects" },
  { href: "/users", label: "Users" },
];

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
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Weekly Reports
        </Link>

        <ul className="flex flex-1 flex-wrap items-center gap-1">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-600 sm:inline dark:text-neutral-400">
            {user.name}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-neutral-600 uppercase dark:bg-neutral-800 dark:text-neutral-400">
            {user.role === "MANAGER" ? "Manager" : "Team member"}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}