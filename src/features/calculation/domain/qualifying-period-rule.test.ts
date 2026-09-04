import { describe, expect, it } from "vitest";
import {
  SKILLED_WORKER_QUALIFYING_PERIOD_RULE,
  isCurrentSkilledWorkerRoute,
  isSkilledWorkerQualifyingRoute,
} from "./qualifying-period-rule";

describe("Skilled Worker qualifying-period rule configuration", () => {
  it("uses five years and the 28-day early application estimate", () => {
    expect(SKILLED_WORKER_QUALIFYING_PERIOD_RULE.qualifyingYears).toBe(5);
    expect(SKILLED_WORKER_QUALIFYING_PERIOD_RULE.earlyApplicationDays).toBe(28);
    expect(SKILLED_WORKER_QUALIFYING_PERIOD_RULE.verifiedAt).toBe("2026-09-04");
  });

  it("distinguishes current settlement routes from earlier qualifying routes", () => {
    for (const route of [
      "skilled-worker",
      "health-and-care-worker",
      "tier-2-general",
    ] as const) {
      expect(isCurrentSkilledWorkerRoute(route)).toBe(true);
      expect(isSkilledWorkerQualifyingRoute(route)).toBe(true);
    }

    for (const route of [
      "global-talent",
      "innovator-founder",
      "t2-minister-of-religion",
      "international-sportsperson",
      "representative-overseas-business",
      "tier-1",
      "scale-up",
    ] as const) {
      expect(isCurrentSkilledWorkerRoute(route)).toBe(false);
      expect(isSkilledWorkerQualifyingRoute(route)).toBe(true);
    }

    expect(isSkilledWorkerQualifyingRoute("other")).toBe(false);
  });
});
