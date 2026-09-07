"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { pageTitleFor } from "@/lib/navigation";
import Avatar from "@/components/ui/Avatar";
import DropdownMenu from "@/components/ui/DropdownMenu";
import ThemeToggle from "@/components/ThemeToggle";
import type { Pagination } from "@/types";

interface Pending {
  count: number;
  label: string;
  href: string;
}

/**
 * Derived from the reports themselves rather than a notifications table: a
 * manager is told what is waiting on a review, a team member what has been
 * sent back to them.
 */
function usePendingWork(isManager: boolean): Pending | null {
  const [count, setCount] = useState<number | null>(null);

  const path = isManager
    ? "/reports?status=SUBMITTED&pageSize=1"
    : "/reports/mine?status=NEEDS_CORRECTION&pageSize=1";

  useEffect(() => {
    let active = true;

    api
      .get<{ pagination: Pagination }>(path)
      .then((data) => {
        if (active) setCount(data.pagination.total);
      })
      .catch(() => {
        // The bell is not worth an error state; it just stays quiet.
      });

    return () => {
      active = false;
    };
  }, [path]);

  if (count === null) return null;

  return isManager
    ? {
        count,
        label: count === 1 ? "report awaiting review" : "reports awaiting review",
        href: "/team",
      }
    : {
        count,
        label: count === 1 ? "report needs your edits" : "reports need your edits",
        href: "/reports",
      };
}

export default function AppHeader({
  onOpenNavigation,
}: {
  onOpenNavigation: () => void;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isManager = user?.role === "MANAGER";
  const pending = usePendingWork(isManager);

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          className="-ml-1 rounded-md p-2 text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Context, not a heading - the page below owns its own h1. */}
        <p className="truncate text-sm font-medium text-ink-2">
          {pageTitleFor(pathname)}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu
            label="Notifications"
            trigger={
              <span className="relative">
                <Bell size={17} />
                {pending && pending.count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface"
                  />
                )}
              </span>
            }
          >
            <div className="w-64 px-3 py-2.5">
              <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
                Needs attention
              </p>

              {!pending || pending.count === 0 ? (
                <p className="mt-2 text-sm text-ink-3">
                  Nothing is waiting on you right now.
                </p>
              ) : (
                <Link
                  href={pending.href}
                  className="mt-2 flex items-baseline gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-muted"
                >
                  <span className="font-semibold tabular-nums">
                    {pending.count}
                  </span>
                  <span className="text-ink-2">{pending.label}</span>
                </Link>
              )}
            </div>
          </DropdownMenu>

          <ThemeToggle />

          <DropdownMenu
            label="Account"
            triggerClassName="inline-flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 transition-colors hover:bg-surface-muted"
            trigger={
              <>
                <Avatar name={user.name} size="sm" />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-[11px] tracking-wide text-ink-3 uppercase">
                    {isManager ? "Manager" : "Team member"}
                  </span>
                </span>
                <ChevronDown size={14} className="text-ink-3" />
              </>
            }
            items={[
              {
                label: "Sign out",
                icon: <LogOut />,
                onSelect: handleLogout,
              },
            ]}
          >
            <div className="border-b border-line-soft px-3 py-2.5 sm:hidden">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-ink-3">{user.email}</p>
            </div>
            <div className="hidden border-b border-line-soft px-3 py-2.5 sm:block">
              <p className="text-xs text-ink-3">{user.email}</p>
            </div>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
