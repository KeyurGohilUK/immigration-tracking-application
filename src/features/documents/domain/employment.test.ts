import { describe, expect, it } from "vitest";
import {
  getEmployerLetterTimingStatus,
  validateEmploymentRecord,
  type EmploymentRecord,
} from "./employment";

const base: EmploymentRecord = {
  version: 1,
  profileId: "member-1",
  employerName: "Example Ltd",
  jobTitle: "Software Engineer",
  sponsorshipStatus: "sponsored",
  employmentStartDate: "2023-01-10",
  employmentEndDate: "",
  annualSalary: 52000,
  createdAt: "2026-09-08T10:00:00.000Z",
  updatedAt: "2026-09-08T10:00:00.000Z",
};

describe("employment record", () => {
  it("validates structured employment dates and salary", () => {
    expect(validateEmploymentRecord(base)).toBeNull();
    expect(
      validateEmploymentRecord({
        ...base,
        employmentEndDate: "2022-12-31",
      }),
    ).toBe("Employment end date cannot be before the start date.");
  });

  it("marks the employer letter for review when the application window opens", () => {
    expect(
      getEmployerLetterTimingStatus(base, true, "2028-05-09", "2028-05-08"),
    ).toBe("recorded-before-window");
    expect(
      getEmployerLetterTimingStatus(base, true, "2028-05-09", "2028-05-09"),
    ).toBe("review-at-application");
  });

  it("keeps missing details and evidence explicit", () => {
    expect(getEmployerLetterTimingStatus(null, true, null, "2026-09-08")).toBe(
      "details-missing",
    );
    expect(
      getEmployerLetterTimingStatus(base, false, null, "2026-09-08"),
    ).toBe("letter-missing");
  });
});
