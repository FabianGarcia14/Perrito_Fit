// ─── Perrito Fit – Date Utilities ─────────────────────────────────────────────

/**
 * Returns today's date as 'YYYY-MM-DD' in the device's LOCAL timezone.
 * This avoids the UTC offset bug where toISOString() can return tomorrow's date.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a YYYY-MM-DD date string by the given number of days.
 */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST edge cases
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

/**
 * Formats a YYYY-MM-DD string for display.
 * e.g., '2026-06-13' → 'Friday, June 13'
 */
export function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Returns true if the given date string matches today's local date.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalDateString();
}
