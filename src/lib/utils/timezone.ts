/**
 * DST-safe timezone helpers using date-fns-tz.
 * Replaces the fragile Intl-based math in `@/lib/utils`.
 *
 * Guarantees:
 *  - Correct UTC offset even when a given local date crosses DST boundaries.
 *  - Works on the server (Node) and in the browser.
 */
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz'

/** Default / fallback timezone (matches DB default). */
export const DEFAULT_TZ = 'America/Montevideo'

/** Validate an IANA timezone string. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

/**
 * Combine a local date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss) interpreted in `tz`
 * and return the corresponding UTC ISO string.
 */
export function localToUTC(dateStr: string, time: string, tz: string): string {
  const t = time.length === 5 ? `${time}:00` : time
  // fromZonedTime interprets the naive string as wall-clock time in `tz`.
  const utc = fromZonedTime(`${dateStr}T${t}`, tz)
  return utc.toISOString()
}

/** Start-of-day and end-of-day in UTC for a given date in `tz`. */
export function dayBoundsUTC(dateStr: string, tz: string) {
  return {
    startUTC: localToUTC(dateStr, '00:00:00', tz),
    endUTC: localToUTC(dateStr, '23:59:59.999', tz),
  }
}

/** Return YYYY-MM-DD for "today" in `tz`. */
export function todayInTimezone(tz: string): string {
  return formatTz(toZonedTime(new Date(), tz), 'yyyy-MM-dd', { timeZone: tz })
}

/**
 * Return the current wall-clock components (year/month/day/hour/minute/second)
 * in the specified timezone. Useful for greeting logic and day-based UIs.
 */
export function nowInTimezone(tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  }
}

/** Return a zoned `Date` (useful for date-fns formatting). */
export function toZoned(date: Date | string, tz: string): Date {
  return toZonedTime(typeof date === 'string' ? new Date(date) : date, tz)
}

/**
 * Format a Date in a specific timezone using Intl.
 * Drop-in replacement for the previous `formatInTimezone`.
 */
export function formatInTimezone(
  date: Date,
  tz: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat('es-UY', { ...options, timeZone: tz }).format(date)
}
