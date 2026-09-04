export const APP_VERSION = "3.25.0";

export const RELEASE_NOTES = [
  "Calculation correctness review completed against current GOV.UK Skilled Worker and continuous-residence rules, verified 4 September 2026.",
  "Pre-11 January 2018 absences now use application-date-anchored consecutive 12-month periods while later grants use rolling 12-month windows.",
  "Expanded calculation tests cover route configuration, 180-day boundaries, same-day travel, calendar boundaries, route changes, gaps, and first-entry absences.",
] as const;
