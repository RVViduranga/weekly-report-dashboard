"use client";

import { useLayoutEffect } from "react";
import {
  reapplyStoredTheme,
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];

function Glyph({ name }: { name: ThemePreference }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "light") {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="3.4" />
        <path d="M10 2.6v1.6M10 15.8v1.6M17.4 10h-1.6M4.2 10H2.6M15.2 4.8l-1.1 1.1M5.9 14.1l-1.1 1.1M15.2 15.2l-1.1-1.1M5.9 5.9 4.8 4.8" />
      </svg>
    );
  }

  if (name === "dark") {
    return (
      <svg {...common}>
        <path d="M16.2 12.3A6.8 6.8 0 0 1 7.7 3.8a6.9 6.9 0 1 0 8.5 8.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2.8" y="4" width="14.4" height="9.6" rx="1.4" />
      <path d="M7.5 17h5" />
    </svg>
  );
}

export default function ThemeToggle() {
  const preference = useThemePreference();

  // React's dev remount resets the attributes on <html>, which drops the one
  // the bootstrap script set. Putting it back before paint is a no-op in
  // production, where the script's work is never undone.
  useLayoutEffect(() => {
    reapplyStoredTheme();
  }, []);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setThemePreference(option.value)}
            aria-pressed={active}
            title={option.label}
            className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-surface text-ink shadow-card"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            <Glyph name={option.value} />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
