const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", DATE_OPTIONS);
}

export function formatWeekRange(startIso: string, endIso: string): string {
  const start = new Date(startIso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${start} - ${formatDate(endIso)}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}