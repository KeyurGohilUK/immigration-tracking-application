import type { ImmigrationRoute } from "../../immigration/domain/immigration-permission";

export const SKILLED_WORKER_DEPENDANT_PERIOD_RULE = {
  id: "skilled-worker-dependant-partner-qualifying-period-v1",
  version: 1,
  qualifyingYears: 5,
  earlyApplicationDays: 28,
  qualifyingRoutes: [
    "skilled-worker",
    "health-and-care-worker",
    "tier-2-general",
  ],
  supportedRole: "dependant",
  verifiedAt: "2026-08-31",
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
      label: "Skilled Worker settlement: family members",
      url: "https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/family-members",
    },
  ],
} as const satisfies {
  id: string;
  version: number;
  qualifyingYears: number;
  earlyApplicationDays: number;
  qualifyingRoutes: readonly ImmigrationRoute[];
  supportedRole: "dependant";
  verifiedAt: string;
  sources: readonly { label: string; url: string }[];
};

export function isSkilledWorkerDependantRoute(
  route: ImmigrationRoute,
): boolean {
  return SKILLED_WORKER_DEPENDANT_PERIOD_RULE.qualifyingRoutes.some(
    (candidate) => candidate === route,
  );
}
