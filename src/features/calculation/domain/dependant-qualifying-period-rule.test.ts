import { describe, expect, it } from "vitest";
import {
  SKILLED_WORKER_DEPENDANT_PERIOD_RULE,
  isSkilledWorkerDependantRoute,
} from "./dependant-qualifying-period-rule";

describe("Skilled Worker dependant rule configuration", () => {
  it("uses the five-year and 28-day dependant timing rule", () => {
    expect(SKILLED_WORKER_DEPENDANT_PERIOD_RULE.qualifyingYears).toBe(5);
    expect(SKILLED_WORKER_DEPENDANT_PERIOD_RULE.earlyApplicationDays).toBe(28);
    expect(SKILLED_WORKER_DEPENDANT_PERIOD_RULE.verifiedAt).toBe("2026-09-04");
  });

  it("limits dependant timing to Skilled Worker-family permissions", () => {
    expect(isSkilledWorkerDependantRoute("skilled-worker")).toBe(true);
    expect(isSkilledWorkerDependantRoute("health-and-care-worker")).toBe(true);
    expect(isSkilledWorkerDependantRoute("tier-2-general")).toBe(true);
    expect(isSkilledWorkerDependantRoute("global-talent")).toBe(false);
    expect(isSkilledWorkerDependantRoute("other")).toBe(false);
  });
});
