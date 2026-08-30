import { describe, expect, it } from "vitest";
import { getUkCalendarDate } from "./uk-calendar-date";

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
});
