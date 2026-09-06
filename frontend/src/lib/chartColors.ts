"use client";

import { useSyncExternalStore } from "react";

/**
 * Palette validated for colour-vision deficiency and 3:1 contrast against both
 * the light and the dark chart surface. Do not swap individual hues without
 * re-checking the set - the separations only hold as a group.
 */
const LIGHT = {
  line: "#2a78d6",
  APPROVED: "#008300",
  SUBMITTED: "#2a78d6",
  NEEDS_CORRECTION: "#eb6834",
  DRAFT: "#4a3aa7",
  grid: "#e5e5e5",
  axis: "#737373",
  tooltipBg: "#ffffff",
  tooltipBorder: "#d4d4d4",
  tooltipText: "#171717",
};

const DARK = {
  line: "#3987e5",
  APPROVED: "#008300",
  SUBMITTED: "#3987e5",
  NEEDS_CORRECTION: "#d95926",
  DRAFT: "#9085e9",
  grid: "#262626",
  axis: "#a3a3a3",
  tooltipBg: "#171717",
  tooltipBorder: "#404040",
  tooltipText: "#ededed",
};

export type ChartColors = typeof LIGHT;

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_MODE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isDarkInBrowser(): boolean {
  return window.matchMedia(DARK_MODE_QUERY).matches;
}

/** The server has no colour scheme to read, so it renders the light palette. */
function isDarkOnServer(): boolean {
  return false;
}

export function useChartColors(): ChartColors {
  const isDark = useSyncExternalStore(
    subscribeToColorScheme,
    isDarkInBrowser,
    isDarkOnServer
  );

  return isDark ? DARK : LIGHT;
}