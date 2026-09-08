"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Button from "./Button";

/**
 * A modal that takes focus and gives it back. Destructive actions get one of
 * these rather than `window.confirm`, so the wording and the button labels can
 * say what is actually about to happen.
 */
export default function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  /**
   * Focus moves in when the dialog opens and back out when it closes, and this
   * depends on `open` alone. Callers pass `onClose` as an inline arrow, so it is
   * a new function on every render - keeping it in these dependencies re-ran the
   * effect on every keystroke and pulled the caret back to the first field.
   */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  // Escape closes and Tab stays inside. This one does need the current
  // `onClose`, and re-subscribing a listener costs nothing.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-raised"
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>

        {description && (
          <div id={descriptionId} className="mt-1.5 text-sm text-ink-2">
            {description}
          </div>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-5 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

/** The common shape: a question, a way out, and one destructive confirmation. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            busy={busy}
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
