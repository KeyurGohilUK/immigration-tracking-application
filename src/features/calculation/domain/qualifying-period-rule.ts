import type { ImmigrationRoute } from "../../immigration/domain/immigration-permission";

export const SKILLED_WORKER_QUALIFYING_PERIOD_RULE = {
  id: "skilled-worker-main-applicant-qualifying-period-v1",
  version: 1,
  qualifyingYears: 5,
  earlyApplicationDays: 28,
  currentRoutes: ["skilled-worker", "health-and-care-worker", "tier-2-general"],
  qualifyingRoutes: [
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
  ],
  supportedRole: "main-applicant",
  verifiedAt: "2026-08-30",
  sources: [
    {
      label: "Immigration Rules Appendix Skilled Worker",
      url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-skilled-worker",
    },
    {
      label: "Immigration Rules Appendix Continuous Residence",
      url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence",
    },
    {
      label: "Skilled Worker settlement: time in the UK",
      url: "https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/time-uk",
    },
    {
      label: "Continuous residence caseworker guidance",
      url: "https://www.gov.uk/government/publications/continuous-residence-caseworker-guidance/continuous-residence-guidance-accessible-version",
    },
  ],
} as const satisfies {
  id: string;
  version: number;
  qualifyingYears: number;
  earlyApplicationDays: number;
  currentRoutes: readonly ImmigrationRoute[];
  qualifyingRoutes: readonly ImmigrationRoute[];
  supportedRole: "main-applicant";
  verifiedAt: string;
  sources: readonly { label: string; url: string }[];
};

export function isCurrentSkilledWorkerRoute(route: ImmigrationRoute): boolean {
  return SKILLED_WORKER_QUALIFYING_PERIOD_RULE.currentRoutes.some(
    (candidate) => candidate === route,
  );
}

export function isSkilledWorkerQualifyingRoute(
  route: ImmigrationRoute,
): boolean {
  return SKILLED_WORKER_QUALIFYING_PERIOD_RULE.qualifyingRoutes.some(
    (candidate) => candidate === route,
  );
}
