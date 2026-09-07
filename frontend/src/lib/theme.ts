"use client";

import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "weekly-reports-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The same work the module below does, inlined into the document head so the
 * theme is on <html> before the first paint instead of flashing after
 * hydration. It resolves "system" here rather than leaving it to a media query,
 * which is what lets globals.css state each palette exactly once.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t!=="light"&&t!=="dark")t=window.matchMedia(${JSON.stringify(
  DARK_QUERY
)}).matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

let preference: ThemePreference | null = null;
const listeners = new Set<() => void>();

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // Blocked storage and private windows both land here.
  }
  return "system";
}

function current(): ThemePreference {
  if (preference === null) preference = readStored();
  return preference;
}

function resolve(choice: ThemePreference): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function applyToDocument(): void {
  document.documentElement.setAttribute("data-theme", resolve(current()));
}

export function setThemePreference(next: ThemePreference): void {
  preference = next;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The choice still applies to this page; it just will not be remembered.
  }

  applyToDocument();
  for (const listener of listeners) listener();
}

/** Puts the theme back after React's dev remount strips the attribute. */
export function reapplyStoredTheme(): void {
  applyToDocument();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  const media = window.matchMedia(DARK_QUERY);
  const handleSystemChange = () => {
    // Only "system" follows the OS, but re-applying is harmless either way.
    if (current() === "system") applyToDocument();
    onChange();
  };

  media.addEventListener("change", handleSystemChange);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", handleSystemChange);
  };
}

function getPreference(): ThemePreference {
  return current();
}

function getResolved(): "light" | "dark" {
  return resolve(current());
}

/** The server has neither storage nor a colour scheme to read. */
function getServerPreference(): ThemePreference {
  return "system";
}

function getServerResolved(): "light" | "dark" {
  return "light";
}

/** What the user chose: light, dark, or follow the system. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getPreference, getServerPreference);
}

/** What that choice resolves to right now. */
export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, getResolved, getServerResolved);
}
