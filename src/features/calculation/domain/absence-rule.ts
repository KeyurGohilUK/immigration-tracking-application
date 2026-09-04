import type { ImmigrationRoute } from "../../immigration/domain/immigration-permission";

export const ABSENCE_RULE = {
  id: "skilled-worker-main-applicant-absence-v2",
  version: 2,
  supportedRoutes: [
    "skilled-worker",
    "health-and-care-worker",
    "tier-2-general",
  ],
  supportedRole: "main-applicant",
  qualifyingYears: 5,
  maximumDays: 180,
  rollingMonths: 12,
  effectiveFrom: "2018-01-11",
  verifiedAt: "2026-09-04",
  guidanceLastUpdated: "2026-06-08",
  sources: [
    {
      label: "Immigration Rules Appendix Continuous Residence",
      url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence",
    },
    {
      label: "Continuous residence caseworker guidance",
      url: "https://www.gov.uk/government/publications/continuous-residence-caseworker-guidance/continuous-residence-guidance-accessible-version",
    },
    {
      label: "Skilled Worker settlement: time in the UK",
      url: "https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/time-uk",
    },
  ],
} as const satisfies {
  id: string;
  version: number;
  supportedRoutes: readonly ImmigrationRoute[];
  supportedRole: "main-applicant";
  qualifyingYears: number;
  maximumDays: number;
  rollingMonths: number;
  effectiveFrom: string;
  verifiedAt: string;
  guidanceLastUpdated: string;
  sources: readonly { label: string; url: string }[];
};

export function isAbsenceRuleRoute(
  route: ImmigrationRoute,
): route is "skilled-worker" | "health-and-care-worker" | "tier-2-general" {
  return ABSENCE_RULE.supportedRoutes.some(
    (supportedRoute) => supportedRoute === route,
  );
}
