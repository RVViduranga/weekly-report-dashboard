"use client";

import { useResolvedTheme } from "@/lib/theme";

/**
 * Two palettes doing two different jobs.
 *
 * `line` is the single-series colour, and it is the interface accent, so a
 * chart with one measure reads as part of the page rather than a guest on it.
 * The four status colours are categorical and semantic - green approved, amber
 * sent back - and they are checked as a set for colour-vision deficiency and
 * for 3:1 contrast against their own surface. Do not swap one hue on its own:
 * the separations only hold as a group, in the order they are stacked.
 */
const LIGHT = {
  line: "#1d4ed8",
  APPROVED: "#177a45",
  SUBMITTED: "#2f6fe0",
  NEEDS_CORRECTION: "#c2620a",
  DRAFT: "#8250d6",
  grid: "#e4e4e7",
  axis: "#6e6e78",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e4e4e7",
  tooltipText: "#18181b",
};

const DARK = {
  line: "#60a5fa",
  APPROVED: "#008300",
  SUBMITTED: "#3987e5",
  NEEDS_CORRECTION: "#d95926",
  DRAFT: "#9085e9",
  grid: "#27272d",
  axis: "#8e8e99",
  tooltipBg: "#1a1a1f",
  tooltipBorder: "#27272d",
  tooltipText: "#ededf0",
};

export type ChartColors = typeof LIGHT;

/**
 * Charts read the same resolved theme the rest of the interface does, so the
 * toggle moves them along with everything else - not just the system setting.
 */
export function useChartColors(): ChartColors {
  return useResolvedTheme() === "dark" ? DARK : LIGHT;
}