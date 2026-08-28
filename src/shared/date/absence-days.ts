const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string): number {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new TypeError("Date must use the YYYY-MM-DD format.");
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError("Date must be a valid calendar date.");
  }

  return timestamp;
}

export function calculateCompleteAbsenceDays(
  departureDate: string,
  returnDate: string,
): number {
  const departure = parseIsoDate(departureDate);
  const returned = parseIsoDate(returnDate);

  if (returned < departure) {
    throw new RangeError("Return date cannot be before departure date.");
  }

  const elapsedCalendarDays = Math.round((returned - departure) / 86_400_000);
  return Math.max(0, elapsedCalendarDays - 1);
}
