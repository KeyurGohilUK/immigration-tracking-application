export const APP_VERSION = "0.11.0";

export const RELEASE_NOTES = [
  "Validated every owner, family, permission, and trip record before encrypted storage.",
  "Added strict identifiers, timestamps, canonical text, and overlapping-trip checks at storage boundaries.",
  "Aligned date-of-birth validation with the UK civil calendar date.",
] as const;
