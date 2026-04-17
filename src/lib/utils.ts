import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isAppointmentPast(startAt: string): boolean {
  return new Date(startAt) < new Date()
}

/**
 * Get the current time in a specific timezone as a Date-like object.
 * Returns { year, month, day, hour, minute } in the target timezone.
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

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0'
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    minute: parseInt(get('minute')),
    second: parseInt(get('second')),
  }
}

/**
 * Get ISO date string (YYYY-MM-DD) for "today" in the given timezone.
 */
export function todayInTimezone(tz: string): string {
  const { year, month, day } = nowInTimezone(tz)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Convert a local date string (YYYY-MM-DD) + time (HH:mm:ss) in a timezone
 * to a UTC ISO string for Supabase queries.
 */
export function localToUTC(dateStr: string, time: string, tz: string): string {
  // Create a temporary date to find the UTC offset for this timezone at this date/time
  const fakeDate = new Date(`${dateStr}T${time}`)
  const utcStr = fakeDate.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = fakeDate.toLocaleString('en-US', { timeZone: tz })
  const utcDate = new Date(utcStr)
  const tzDate = new Date(tzStr)
  const offsetMs = utcDate.getTime() - tzDate.getTime()

  // The actual local time interpreted as UTC, then shifted by offset
  const localAsUTC = new Date(`${dateStr}T${time}Z`)
  return new Date(localAsUTC.getTime() + offsetMs).toISOString()
}

/**
 * Get start-of-day and end-of-day in UTC for a given timezone's "today".
 */
export function dayBoundsUTC(dateStr: string, tz: string) {
  return {
    startUTC: localToUTC(dateStr, '00:00:00', tz),
    endUTC: localToUTC(dateStr, '23:59:59', tz),
  }
}

/**
 * Format a Date for display in a specific timezone.
 */
export function formatInTimezone(date: Date, tz: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-UY', { ...options, timeZone: tz }).format(date)
}
