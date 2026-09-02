import type { TripStatus } from "@/types/trip";

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Total length of the trip, in days, inclusive of both start and end dates. */
export function calculateTripDays(startDate: string, endDate: string): number {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** Whether the trip hasn't started yet, is in progress, or has ended, relative to `now`. */
export function calculateTripStatus(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): TripStatus {
  const today = startOfDay(now).getTime();
  const start = startOfDay(new Date(startDate)).getTime();
  const end = startOfDay(new Date(endDate)).getTime();

  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "active";
}

/** Days from today through the trip's end date, inclusive. Never negative. */
export function calculateRemainingDays(endDate: string, now: Date = new Date()): number {
  const today = startOfDay(now).getTime();
  const end = startOfDay(new Date(endDate)).getTime();
  return Math.max(0, Math.round((end - today) / DAY_MS) + 1);
}

/** How much of the total budget is left, given what's actually been spent. */
export function calculateRemainingBudget(totalBudget: number, spent: number): number {
  return totalBudget - spent;
}

/**
 * How much can safely be spent per remaining day. On the last day (or if
 * called with 0 remaining days), the whole remaining budget is "today's"
 * allowance rather than dividing by zero.
 */
export function calculateDailyBudget(
  remainingBudget: number,
  remainingDays: number,
): number {
  const divisor = remainingDays > 0 ? remainingDays : 1;
  return remainingBudget / divisor;
}
