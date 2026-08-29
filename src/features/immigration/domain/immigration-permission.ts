export const IMMIGRATION_ROUTES = [
  "skilled-worker",
  "health-and-care-worker",
  "other",
] as const;

export const PERMISSION_ROLES = ["main-applicant", "dependant"] as const;

export type ImmigrationRoute = (typeof IMMIGRATION_ROUTES)[number];
export type PermissionRole = (typeof PERMISSION_ROLES)[number];

export interface ImmigrationPermissionInput {
  route: ImmigrationRoute;
  otherRouteName: string;
  role: PermissionRole;
  permissionStartDate: string;
  permissionExpiryDate: string;
  actualUkArrivalDate: string;
}

export interface ImmigrationPermission extends ImmigrationPermissionInput {
  version: 1;
  id: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateImmigrationPermissionInput(
  input: ImmigrationPermissionInput,
): string | null {
  if (!IMMIGRATION_ROUTES.includes(input.route))
    return "Choose an immigration route.";
  const otherRouteName = input.otherRouteName.trim();
  if (
    input.route === "other" &&
    (otherRouteName.length < 1 || otherRouteName.length > 100)
  )
    return "Enter the permission route name.";
  if (!PERMISSION_ROLES.includes(input.role))
    return "Choose whether this permission was as a main applicant or dependant.";
  if (!isCalendarDate(input.permissionStartDate))
    return "Enter a valid permission start date.";
  if (!isCalendarDate(input.permissionExpiryDate))
    return "Enter a valid permission expiry date.";
  if (input.permissionStartDate > input.permissionExpiryDate)
    return "Permission expiry must be on or after its start date.";
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
    permission.version !== 1 ||
    typeof permission.id !== "string" ||
    permission.id.length < 1 ||
    permission.id.length > 100 ||
    typeof permission.profileId !== "string" ||
    permission.profileId.length < 1 ||
    permission.profileId.length > 100 ||
    !IMMIGRATION_ROUTES.includes(permission.route as ImmigrationRoute) ||
    typeof permission.otherRouteName !== "string" ||
    !PERMISSION_ROLES.includes(permission.role as PermissionRole) ||
    typeof permission.permissionStartDate !== "string" ||
    typeof permission.permissionExpiryDate !== "string" ||
    typeof permission.actualUkArrivalDate !== "string" ||
    typeof permission.createdAt !== "string" ||
    typeof permission.updatedAt !== "string"
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

export function getPermissionRouteLabel(
  permission: ImmigrationPermission,
): string {
  if (permission.route === "skilled-worker") return "Skilled Worker";
  if (permission.route === "health-and-care-worker")
    return "Health and Care Worker";
  return permission.otherRouteName;
}

export function getCalculationSupportMessage(route: ImmigrationRoute): string {
  return route === "other"
    ? "Eligibility calculation is not supported for this route."
    : "Eligibility calculation is not active yet; official rules are still being implemented.";
}
