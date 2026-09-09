import { describe, expect, it } from "vitest";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import type { Trip } from "../../travel/domain/trip";
import { buildIlrJourneyTimeline } from "./ilr-journey-timeline";

const timestamp = "2026-09-08T12:00:00.000Z";

function permission(
  id: string,
  startDate: string,
  expiryDate: string,
): ImmigrationPermission {
  return {
    version: 2,
    id,
    profileId: "owner",
    route: "skilled-worker",
    otherRouteName: "",
    role: "main-applicant",
    grantDate: startDate,
    permissionStartDate: startDate,
    permissionExpiryDate: expiryDate,
    actualUkArrivalDate: startDate,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

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
    destination: `Destination ${id}`,
    notes: "",
    exceptionalAbsence,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("ILR immigration and travel timeline", () => {
  it("orders permission periods and trips from oldest to newest", () => {
    const items = buildIlrJourneyTimeline(
      [
        permission("permission-2", "2025-01-01", "2028-01-01"),
        permission("permission-1", "2022-01-01", "2024-12-31"),
      ],
      [
        trip("trip-2", "2025-07-01", "2025-07-05"),
        trip("trip-1", "2023-04-10", "2023-04-15"),
      ],
      ["permission-1", "permission-2"],
      "2026-09-08",
    );

    expect(items.map(({ id }) => id)).toEqual([
      "permission-1",
      "trip-1",
      "permission-2",
      "trip-2",
    ]);
  });

  it("marks current and qualifying permissions independently", () => {
    const [historical, current] = buildIlrJourneyTimeline(
      [
        permission("historical", "2021-01-01", "2023-12-31"),
        permission("current", "2024-01-01", "2028-12-31"),
      ],
      [],
      ["current"],
      "2026-09-08",
    );

    expect(historical).toMatchObject({
      type: "permission",
      current: false,
      qualifying: false,
    });
    expect(current).toMatchObject({
      type: "permission",
      current: true,
      qualifying: true,
    });
  });

  it("counts only whole days outside the UK and keeps open trips explicit", () => {
    const [closed, open] = buildIlrJourneyTimeline(
      [],
      [
        trip("closed", "2026-08-01", "2026-08-10"),
        trip("open", "2026-09-01", "", true),
      ],
      [],
      "2026-09-08",
    );

    expect(closed).toMatchObject({
      type: "trip",
      daysOutside: 8,
      open: false,
    });
    expect(open).toMatchObject({
      type: "trip",
      daysOutside: null,
      open: true,
      exceptional: true,
    });
  });
});
