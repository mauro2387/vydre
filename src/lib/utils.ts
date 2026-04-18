import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isAppointmentPast(startAt: string): boolean {
  return new Date(startAt) < new Date()
}

// Re-export DST-safe timezone helpers so existing call sites keep working.
export {
  DEFAULT_TZ,
  isValidTimezone,
  localToUTC,
  dayBoundsUTC,
  todayInTimezone,
  nowInTimezone,
  formatInTimezone,
} from './utils/timezone'
