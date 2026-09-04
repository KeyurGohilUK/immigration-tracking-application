import { describe, expect, it } from "vitest";
import { ABSENCE_RULE, isAbsenceRuleRoute } from "./absence-rule";

describe("Skilled Worker absence rule configuration", () => {
  it("uses the verified 180-day transitional boundary", () => {
    expect(ABSENCE_RULE.id).toBe("skilled-worker-main-applicant-absence-v2");
    expect(ABSENCE_RULE.version).toBe(2);
    expect(ABSENCE_RULE.maximumDays).toBe(180);
    expect(ABSENCE_RULE.rollingMonths).toBe(12);
    expect(ABSENCE_RULE.effectiveFrom).toBe("2018-01-11");
    expect(ABSENCE_RULE.verifiedAt).toBe("2026-09-04");
  });

  it("supports the current Skilled Worker family of routes only", () => {
    expect(isAbsenceRuleRoute("skilled-worker")).toBe(true);
    expect(isAbsenceRuleRoute("health-and-care-worker")).toBe(true);
    expect(isAbsenceRuleRoute("tier-2-general")).toBe(true);
    expect(isAbsenceRuleRoute("global-talent")).toBe(false);
    expect(isAbsenceRuleRoute("other")).toBe(false);
  });
});
