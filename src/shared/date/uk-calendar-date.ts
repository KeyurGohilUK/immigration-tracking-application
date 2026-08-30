export function getUkCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter(
        ({ type }) => type === "year" || type === "month" || type === "day",
      )
      .map(({ type, value }) => [type, value]),
  );
  if (!values.year || !values.month || !values.day)
    throw new Error("The UK calendar date is unavailable.");
  return `${values.year}-${values.month}-${values.day}`;
}
