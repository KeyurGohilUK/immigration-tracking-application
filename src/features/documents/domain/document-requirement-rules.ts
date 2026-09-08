import type { HouseholdMember } from "../../household/domain/household-member";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import { isSkilledWorkerDependantRoute } from "../../calculation/domain/dependant-qualifying-period-rule";

const ENGLISH_SETTLEMENT_CHANGE_DATE = "2027-03-26";

function getAgeOnDate(dateOfBirth: string, date: string): number {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const target = new Date(`${date}T00:00:00Z`);
  let age = target.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    target.getUTCMonth() < birth.getUTCMonth() ||
    (target.getUTCMonth() === birth.getUTCMonth() &&
      target.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function getRouteDrivenNotApplicableRequirementIds(
  member: HouseholdMember,
  permissions: readonly ImmigrationPermission[],
  applicationDate: string,
): string[] {
  const latestPermission = [...permissions].sort((left, right) =>
    right.permissionStartDate.localeCompare(left.permissionStartDate),
  )[0];
  if (
    !latestPermission ||
    !isSkilledWorkerDependantRoute(latestPermission.route)
  )
    return [];

  const age = getAgeOnDate(member.dateOfBirth, applicationDate);
  const ageExempt = age < 18 || age >= 65;
  const notApplicable = new Set<string>();

  if (latestPermission.role === "main-applicant") {
    notApplicable.add("relationship-evidence");
    if (applicationDate < ENGLISH_SETTLEMENT_CHANGE_DATE)
      notApplicable.add("english-language");
  }

  if (ageExempt) {
    notApplicable.add("life-in-uk");
    notApplicable.add("english-language");
  }

  return [...notApplicable];
}
