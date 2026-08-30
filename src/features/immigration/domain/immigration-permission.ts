import { isCalendarDate } from "../../../shared/date/uk-calendar-date";
import {
  hasValidStoredRecordMetadata,
  isRecordIdentifier,
} from "../../../shared/validation/stored-record";

export const IMMIGRATION_ROUTES = [
  "skilled-worker",
  "health-and-care-worker",
  "tier-2-general",
  "global-talent",
  "innovator-founder",
  "t2-minister-of-religion",
  "international-sportsperson",
  "representative-overseas-business",
  "tier-1",
  "scale-up",
  "other",
] as const;

export const PERMISSION_ROLES = ["main-applicant", "dependant"] as const;

export type ImmigrationRoute = (typeof IMMIGRATION_ROUTES)[number];
export type PermissionRole = (typeof PERMISSION_ROLES)[number];

export interface ImmigrationPermissionInput {
  route: ImmigrationRoute;
  otherRouteName: string;
  role: PermissionRole;
  grantDate: string;
  permissionStartDate: string;
  permissionExpiryDate: string;
  actualUkArrivalDate: string;
}

export interface ImmigrationPermission extends ImmigrationPermissionInput {
  version: 2;
  id: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

export function validateImmigrationPermissionInput(
  input: ImmigrationPermissionInput,
): string | null {
  if (!IMMIGRATION_ROUTES.includes(input.route))
    return "Choose an immigration route.";
  const otherRouteName = input.otherRouteName.trim();
  if (otherRouteName.length > 100)
    return "Permission route name must be 100 characters or fewer.";
  if (
    input.route === "other" &&
    (otherRouteName.length < 1 || otherRouteName.length > 100)
  )
    return "Enter the permission route name.";
  if (!PERMISSION_ROLES.includes(input.role))
    return "Choose whether this permission was as a main applicant or dependant.";
  if (input.grantDate && !isCalendarDate(input.grantDate))
    return "Enter a valid visa grant date.";
  if (!isCalendarDate(input.permissionStartDate))
    return "Enter a valid permission start date.";
  if (!isCalendarDate(input.permissionExpiryDate))
    return "Enter a valid permission expiry date.";
  if (input.permissionStartDate > input.permissionExpiryDate)
    return "Permission expiry must be on or after its start date.";
  if (input.grantDate && input.grantDate > input.permissionExpiryDate)
    return "Visa grant date cannot be after permission expiry.";
  if (input.actualUkArrivalDate) {
    if (!isCalendarDate(input.actualUkArrivalDate))
      return "Enter a valid actual UK arrival date.";
    if (
      input.actualUkArrivalDate < input.permissionStartDate ||
      input.actualUkArrivalDate > input.permissionExpiryDate
    )
      return "Actual UK arrival must fall within this permission period.";
  }
  return null;
}

export function isImmigrationPermission(
  value: unknown,
): value is ImmigrationPermission {
  if (!value || typeof value !== "object") return false;
  const permission = value as Partial<ImmigrationPermission>;
  if (
    !hasValidStoredRecordMetadata(permission, 2) ||
    !isRecordIdentifier(permission.profileId) ||
    !IMMIGRATION_ROUTES.includes(permission.route as ImmigrationRoute) ||
    typeof permission.otherRouteName !== "string" ||
    permission.otherRouteName !== permission.otherRouteName.trim() ||
    !PERMISSION_ROLES.includes(permission.role as PermissionRole) ||
    typeof permission.grantDate !== "string" ||
    typeof permission.permissionStartDate !== "string" ||
    typeof permission.permissionExpiryDate !== "string" ||
    typeof permission.actualUkArrivalDate !== "string"
  )
    return false;
  return (
    validateImmigrationPermissionInput(permission as ImmigrationPermission) ===
    null
  );
}

export function isImmigrationPermissionCollection(
  value: unknown,
  profileId: string,
): value is ImmigrationPermission[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (permission) =>
        isImmigrationPermission(permission) &&
        permission.profileId === profileId,
    )
  )
    return false;
  return new Set(value.map(({ id }) => id)).size === value.length;
}

interface LegacyImmigrationPermission extends Omit<
  ImmigrationPermission,
  "version" | "grantDate"
> {
  version: 1;
}

function isLegacyImmigrationPermission(
  value: unknown,
): value is LegacyImmigrationPermission {
  if (!value || typeof value !== "object") return false;
  const permission = value as Partial<LegacyImmigrationPermission>;
  if (
    !hasValidStoredRecordMetadata(permission, 1) ||
    !isRecordIdentifier(permission.profileId) ||
    !IMMIGRATION_ROUTES.includes(permission.route as ImmigrationRoute) ||
    typeof permission.otherRouteName !== "string" ||
    permission.otherRouteName !== permission.otherRouteName.trim() ||
    !PERMISSION_ROLES.includes(permission.role as PermissionRole) ||
    typeof permission.permissionStartDate !== "string" ||
    typeof permission.permissionExpiryDate !== "string" ||
    typeof permission.actualUkArrivalDate !== "string"
  )
    return false;
  return (
    validateImmigrationPermissionInput({
      ...(permission as LegacyImmigrationPermission),
      grantDate: "",
    }) === null
  );
}

export function migrateImmigrationPermissionCollection(
  value: unknown,
  profileId: string,
): ImmigrationPermission[] | null {
  if (!Array.isArray(value)) return null;
  if (isImmigrationPermissionCollection(value, profileId)) return value;
  if (
    !value.every(
      (permission) =>
        isLegacyImmigrationPermission(permission) &&
        permission.profileId === profileId,
    ) ||
    new Set(value.map(({ id }: LegacyImmigrationPermission) => id)).size !==
      value.length
  )
    return null;
  return value.map((permission: LegacyImmigrationPermission) => ({
    ...permission,
    version: 2,
    grantDate: "",
  }));
}

export function getPermissionRouteLabel(
  permission: ImmigrationPermission,
): string {
  if (permission.route === "other") return permission.otherRouteName;
  return PERMISSION_ROUTE_LABELS[permission.route];
}

export const PERMISSION_ROUTE_LABELS: Record<
  Exclude<ImmigrationRoute, "other">,
  string
> = {
  "skilled-worker": "Skilled Worker",
  "health-and-care-worker": "Health and Care Worker",
  "tier-2-general": "Tier 2 (General)",
  "global-talent": "Global Talent",
  "innovator-founder": "Innovator Founder",
  "t2-minister-of-religion": "T2 Minister of Religion",
  "international-sportsperson": "International Sportsperson",
  "representative-overseas-business": "Representative of an Overseas Business",
  "tier-1": "Tier 1 (not Graduate Entrepreneur)",
  "scale-up": "Scale-up",
};

export function getCalculationSupportMessage(route: ImmigrationRoute): string {
  return route === "other"
    ? "Eligibility calculation is not supported for this route."
    : "This route can be assessed as part of a Skilled Worker main-applicant qualifying period on Home.";
}
