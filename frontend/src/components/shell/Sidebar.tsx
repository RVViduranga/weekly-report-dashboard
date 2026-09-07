"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { isActive, navigationFor } from "@/lib/navigation";
import { buttonClasses } from "@/components/ui/Button";
import ProductMark from "@/components/ui/ProductMark";
import type { Role } from "@/types";

export default function Sidebar({
  role,
  onNavigate,
  onClose,
}: {
  role: Role;
  /** Closes the drawer after a tap on mobile. */
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const groups = navigationFor(role);

  return (
    <div className="flex h-full w-60 flex-col border-r border-line bg-surface">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <ProductMark />
          Weekly Reports
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="px-3 pb-3">
        <Link
          href="/reports/new"
          onClick={onNavigate}
          className={buttonClasses("primary", "md", "w-full")}
        >
          <Plus size={15} />
          New report
        </Link>
      </div>

      <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group, index) => (
          <div key={group.label ?? index} className={index > 0 ? "mt-6" : ""}>
            {group.label && (
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
                {group.label}
              </p>
            )}

            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${
                        active
                          ? "bg-accent-soft font-medium text-accent-ink"
                          : "text-ink-2 hover:bg-surface-muted hover:text-ink"
                      }`}
                    >
                      <Icon
                        size={16}
                        strokeWidth={active ? 2.2 : 1.8}
                        className="shrink-0"
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
