import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import { getPermissionRouteLabel } from "../../immigration/domain/immigration-permission";
import type { Trip } from "../../travel/domain/trip";

const DAY_IN_MILLISECONDS = 86_400_000;

export type IlrJourneyTimelineItem =
  | {
      type: "permission";
      id: string;
      startDate: string;
      endDate: string;
      title: string;
      detail: string;
      qualifying: boolean;
      current: boolean;
    }
  | {
      type: "trip";
      id: string;
      startDate: string;
      endDate: string;
      title: string;
      detail: string;
      daysOutside: number | null;
      exceptional: boolean;
      open: boolean;
    };

function dateToUtc(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

function wholeDaysOutside(
  departureDate: string,
  returnDate: string,
): number | null {
  if (!returnDate) return null;
  const difference =
    (dateToUtc(returnDate) - dateToUtc(departureDate)) / DAY_IN_MILLISECONDS;
  return Math.max(0, difference - 1);
}

export function buildIlrJourneyTimeline(
  permissions: readonly ImmigrationPermission[],
  trips: readonly Trip[],
  relevantPermissionIds: readonly string[],
  asOfDate: string,
): IlrJourneyTimelineItem[] {
  const qualifyingIds = new Set(relevantPermissionIds);

  const permissionItems: IlrJourneyTimelineItem[] = permissions.map(
    (permission) => ({
      type: "permission",
      id: permission.id,
      startDate: permission.permissionStartDate,
      endDate: permission.permissionExpiryDate,
      title: getPermissionRouteLabel(permission),
      detail:
        permission.role === "dependant"
          ? "Dependant permission"
          : "Main applicant permission",
      qualifying: qualifyingIds.has(permission.id),
      current:
        permission.permissionStartDate <= asOfDate &&
        permission.permissionExpiryDate >= asOfDate,
    }),
  );

  const tripItems: IlrJourneyTimelineItem[] = trips.map((trip) => ({
    type: "trip",
    id: trip.id,
    startDate: trip.departureDate,
    endDate: trip.returnDate,
    title: trip.destination,
    detail: trip.exceptionalAbsence
      ? "Recorded as potentially permitted absence"
      : "Recorded absence",
    daysOutside: wholeDaysOutside(trip.departureDate, trip.returnDate),
    exceptional: trip.exceptionalAbsence,
    open: !trip.returnDate,
  }));

  return [...permissionItems, ...tripItems].sort(
    (left, right) =>
      left.startDate.localeCompare(right.startDate) ||
      (left.type === "permission" ? -1 : 1),
  );
}
