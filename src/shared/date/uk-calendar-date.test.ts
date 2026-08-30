import { describe, expect, it } from "vitest";
import { getUkCalendarDate, isCalendarDate } from "./uk-calendar-date";

describe("getUkCalendarDate", () => {
  it("uses the Europe/London civil date during British Summer Time", () => {
    expect(getUkCalendarDate(new Date("2026-06-01T23:30:00.000Z"))).toBe(
      "2026-06-02",
    );
  });

  it("uses the Europe/London civil date during winter", () => {
    expect(getUkCalendarDate(new Date("2026-12-01T00:30:00.000Z"))).toBe(
      "2026-12-01",
    );
  });

  it("accepts real civil dates and rejects impossible dates", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2025-02-29")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDate("01-01-2026")).toBe(false);
  });
});
