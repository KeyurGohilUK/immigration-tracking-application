import { describe, expect, it } from "vitest";

import { calculateCompleteAbsenceDays } from "./absence-days";

describe("calculateCompleteAbsenceDays", () => {
  it("does not count departure or return dates", () => {
    expect(calculateCompleteAbsenceDays("2026-06-01", "2026-06-11")).toBe(9);
  });

  it("returns zero for same-day and next-day travel", () => {
    expect(calculateCompleteAbsenceDays("2026-06-01", "2026-06-01")).toBe(0);
    expect(calculateCompleteAbsenceDays("2026-06-01", "2026-06-02")).toBe(0);
  });

  it("handles leap days using calendar dates", () => {
    expect(calculateCompleteAbsenceDays("2028-02-28", "2028-03-02")).toBe(2);
  });

  it("rejects invalid dates and reversed ranges", () => {
    expect(() =>
      calculateCompleteAbsenceDays("2026-02-30", "2026-03-02"),
    ).toThrow(RangeError);
    expect(() =>
      calculateCompleteAbsenceDays("2026-06-11", "2026-06-01"),
    ).toThrow(RangeError);
    expect(() =>
      calculateCompleteAbsenceDays("01/06/2026", "11/06/2026"),
    ).toThrow(TypeError);
  });
});
