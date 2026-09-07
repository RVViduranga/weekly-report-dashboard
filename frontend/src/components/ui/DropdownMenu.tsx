"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Explains why the item is unavailable; also its title attribute. */
  disabledReason?: string;
}

/**
 * A small menu on a trigger. Rows of buttons in a table read as clutter, so
 * per-row actions live in here instead.
 */
export default function DropdownMenu({
  trigger,
  items,
  align = "end",
  label = "Actions",
  triggerClassName = "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink",
  children,
}: {
  trigger: ReactNode;
  items?: MenuItem[];
  align?: "start" | "end";
  label?: string;
  triggerClassName?: string;
  /** Rendered above the items - a header, or the whole panel when there are none. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((was) => !was)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-30 mt-1 min-w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-raised ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {children}

          {items?.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.disabled ? item.disabledReason : undefined}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                item.tone === "danger"
                  ? "text-danger-ink hover:bg-danger-soft"
                  : "text-ink-2 hover:bg-surface-muted hover:text-ink"
              }`}
            >
              {item.icon && (
                <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
