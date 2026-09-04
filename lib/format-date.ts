/** "3 Oct – 14 Oct 2026", or "28 Dec 2026 – 3 Jan 2027" when years differ. */
export function formatDateRange(
  startDate: string,
  endDate: string,
  locale: string,
): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();

  const startFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const endFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${startFormatter.format(start)} – ${endFormatter.format(end)}`;
}

/**
 * "Today", "Yesterday", or "Tuesday, 6 October" — used as expense-list group
 * headings. `todayLabel`/`yesterdayLabel` come from the current dictionary
 * (dict.expenses.today / .yesterday) since those two cases don't have a
 * locale-neutral Intl representation.
 */
export function formatDateHeading(
  dateStr: string,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return todayLabel;
  if (date.getTime() === yesterday.getTime()) return yesterdayLabel;

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
