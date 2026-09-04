import { describe, expect, it } from "vitest";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import type { Trip } from "../../travel/domain/trip";
import {
  calculateRecordedAbsenceCheck,
  calculateRecordedDependantAbsenceCheck,
} from "./absence-calculation";

const permission: ImmigrationPermission = {
  version: 2,
  id: "permission-1",
  profileId: "owner",
  route: "skilled-worker",
  otherRouteName: "",
  role: "main-applicant",
  grantDate: "2022-01-01",
  permissionStartDate: "2022-01-01",
  permissionExpiryDate: "2028-01-01",
  actualUkArrivalDate: "2022-01-01",
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
};

function trip(
  id: string,
  departureDate: string,
  returnDate: string,
  exceptionalAbsence = false,
): Trip {
  return {
    version: 1,
    id,
    profileId: "owner",
    departureDate,
    returnDate,
    destination: "Test destination",
    notes: "",
    exceptionalAbsence,
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
  };
}

describe("recorded absence check", () => {
  it("counts only whole days and keeps exactly 180 within the recorded limit", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("trip-1", "2024-01-01", "2024-06-30")],
      asOfDate: "2026-08-30",
    });
    expect(result.maximumRecordedDays).toBe(180);
    expect(result.status).toBe("within-recorded-limit");
  });

  it("flags more than 180 days without declaring the person ineligible", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("trip-1", "2024-01-01", "2024-07-01")],
      asOfDate: "2026-08-30",
    });
    expect(result.maximumRecordedDays).toBe(181);
    expect(result.status).toBe("potentially-over-limit");
  });

  it("combines separate trips within the same rolling 12 calendar months", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [
        trip("trip-1", "2024-01-01", "2024-04-11"),
        trip("trip-2", "2024-08-01", "2024-10-21"),
      ],
      asOfDate: "2026-08-30",
    });
    expect(result.maximumRecordedDays).toBe(180);
    expect(result.maximumWindow).toEqual({
      startDate: "2024-01-02",
      endDate: "2025-01-01",
      daysOutside: 180,
    });
  });

  it("counts same-day and next-day travel as zero whole absence days", () => {
    const sameDay = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("same-day", "2024-01-01", "2024-01-01")],
      asOfDate: "2026-08-30",
    });
    const nextDay = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("next-day", "2024-01-01", "2024-01-02")],
      asOfDate: "2026-08-30",
    });
    expect(sameDay.maximumRecordedDays).toBe(0);
    expect(nextDay.maximumRecordedDays).toBe(0);
  });

  it("uses calendar dates across leap years", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("trip-1", "2024-02-28", "2024-03-02")],
      asOfDate: "2026-08-30",
    });
    expect(result.maximumRecordedDays).toBe(2);
  });

  it("handles month ends, year ends, and UK daylight-saving boundaries as civil dates", () => {
    const monthEnd = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("month-end", "2024-01-30", "2024-02-02")],
      asOfDate: "2026-08-30",
    });
    const yearEnd = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("year-end", "2024-12-30", "2025-01-02")],
      asOfDate: "2026-08-30",
    });
    const dst = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("dst", "2024-03-30", "2024-04-02")],
      asOfDate: "2026-08-30",
    });
    expect(monthEnd.maximumRecordedDays).toBe(2);
    expect(yearEnd.maximumRecordedDays).toBe(2);
    expect(dst.maximumRecordedDays).toBe(2);
  });

  it("counts pre-entry days from the recorded entry-clearance grant", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [
        {
          ...permission,
          grantDate: "2021-12-15",
          permissionStartDate: "2022-01-01",
          actualUkArrivalDate: "2022-01-15",
        },
      ],
      trips: [],
      asOfDate: "2026-08-30",
    });
    expect(result.maximumRecordedDays).toBe(31);
  });

  it("counts completed days in an open trip but marks the check incomplete", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("trip-1", "2026-08-01", "")],
      asOfDate: "2026-08-05",
    });
    expect(result.maximumRecordedDays).toBe(3);
    expect(result.status).toBe("incomplete");
    expect(result.issues).toContain("open-trip");
  });

  it("requires manual review for a potentially permitted absence", () => {
    const flagged = calculateRecordedAbsenceCheck({
      permissions: [permission],
      trips: [trip("trip-1", "2024-01-01", "2024-01-10", true)],
      asOfDate: "2026-08-30",
    });
    expect(flagged.status).toBe("manual-review");
  });

  it("uses application-date-anchored periods for pre-11-January-2018 permission", () => {
    const transitionalPermission = {
      ...permission,
      grantDate: "2015-07-01",
      permissionStartDate: "2015-07-01",
      permissionExpiryDate: "2018-07-28",
      actualUkArrivalDate: "",
    };
    const result = calculateRecordedAbsenceCheck({
      permissions: [transitionalPermission],
      trips: [
        trip("trip-1", "2017-03-01", "2017-06-30"),
        trip("trip-2", "2017-07-01", "2017-10-30"),
      ],
      asOfDate: "2020-06-30",
    });
    expect(result.status).toBe("within-recorded-limit");
    expect(result.maximumRecordedDays).toBe(120);
    expect(result.maximumWindow).toEqual({
      startDate: "2017-07-01",
      endDate: "2018-06-30",
      daysOutside: 120,
    });
    expect(result.issues).toContain("pre-2018-record");
  });

  it("anchors transitional periods to the prospective application date rather than today", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [
        {
          ...permission,
          grantDate: "2015-07-01",
          permissionStartDate: "2015-07-01",
          permissionExpiryDate: "2018-07-28",
          actualUkArrivalDate: "",
        },
      ],
      trips: [
        trip("trip-1", "2017-03-01", "2017-06-30"),
        trip("trip-2", "2017-07-01", "2017-10-30"),
      ],
      asOfDate: "2019-12-31",
      applicationDate: "2020-06-30",
    });
    expect(result.maximumRecordedDays).toBe(120);
    expect(result.maximumWindow).toEqual({
      startDate: "2017-07-01",
      endDate: "2018-06-30",
      daysOutside: 120,
    });
  });

  it("still flags a transitional fixed period when it exceeds 180 days", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [
        {
          ...permission,
          grantDate: "2015-07-01",
          permissionStartDate: "2015-07-01",
          permissionExpiryDate: "2018-07-28",
          actualUkArrivalDate: "",
        },
      ],
      trips: [trip("trip-1", "2016-07-01", "2017-01-01")],
      asOfDate: "2020-06-30",
    });
    expect(result.maximumRecordedDays).toBe(183);
    expect(result.status).toBe("potentially-over-limit");
  });

  it("switches to rolling windows for absence days under a later grant", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [
        {
          ...permission,
          id: "old",
          grantDate: "2015-07-01",
          permissionStartDate: "2015-07-01",
          permissionExpiryDate: "2018-07-28",
          actualUkArrivalDate: "",
        },
        {
          ...permission,
          id: "new",
          grantDate: "2018-07-29",
          permissionStartDate: "2018-07-29",
          permissionExpiryDate: "2021-07-29",
          actualUkArrivalDate: "",
        },
      ],
      trips: [trip("trip-1", "2018-08-01", "2019-02-01")],
      asOfDate: "2020-06-30",
    });
    expect(result.maximumRecordedDays).toBe(183);
    expect(result.status).toBe("potentially-over-limit");
  });

  it("reports a missing grant date as incomplete", () => {
    const result = calculateRecordedAbsenceCheck({
      permissions: [{ ...permission, grantDate: "" }],
      trips: [],
      asOfDate: "2026-08-30",
    });
    expect(result.status).toBe("incomplete");
    expect(result.issues).toContain("missing-grant-date");
  });

  it("does not apply the main-applicant rule to dependants or other routes", () => {
    const dependant = calculateRecordedAbsenceCheck({
      permissions: [{ ...permission, role: "dependant" }],
      trips: [],
      asOfDate: "2026-08-30",
    });
    const otherRoute = calculateRecordedAbsenceCheck({
      permissions: [
        { ...permission, route: "other", otherRouteName: "Another route" },
      ],
      trips: [],
      asOfDate: "2026-08-30",
    });
    expect(dependant.status).toBe("unsupported");
    expect(otherRoute.status).toBe("unsupported");
  });

  it("applies the separate recorded-absence check to a dependant", () => {
    const result = calculateRecordedDependantAbsenceCheck({
      permissions: [{ ...permission, role: "dependant" }],
      trips: [trip("trip-1", "2024-01-01", "2024-01-12")],
      asOfDate: "2026-08-30",
    });
    expect(result.status).toBe("within-recorded-limit");
    expect(result.maximumRecordedDays).toBe(10);
  });

  it("reports missing permission history as incomplete", () => {
    expect(
      calculateRecordedAbsenceCheck({
        permissions: [],
        trips: [],
        asOfDate: "2026-08-30",
      }).status,
    ).toBe("incomplete");
  });
});
