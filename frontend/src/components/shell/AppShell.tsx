"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/shell/Sidebar";
import AppHeader from "@/components/shell/AppHeader";
import { ToastProvider } from "@/components/ui/Toast";
import type { Role } from "@/types";

export default function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-1">
        {/* Always present from lg up; the drawer below is the same component. */}
        <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block">
          <Sidebar role={role} />
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="relative h-full w-60 shadow-raised"
            >
              <Sidebar
                role={role}
                onNavigate={() => setDrawerOpen(false)}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenNavigation={() => setDrawerOpen(true)} />

          <main
            key={pathname}
            className="flex-1 px-4 py-6 sm:px-6 sm:py-8 2xl:px-10"
          >
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
