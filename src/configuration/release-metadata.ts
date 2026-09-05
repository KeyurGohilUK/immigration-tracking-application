export const APP_VERSION = "3.25.6";

export const RELEASE_NOTES = [
  "A permanent network-privacy regression guard now checks that household, immigration, travel, address, Life in the UK, document, and backup secrets never appear in outgoing requests.",
  "The privacy detector inspects request URLs, decoded query values, headers, and request bodies for deliberately seeded sensitive canary values.",
  "Browser coverage also verifies normal app traffic remains same-origin while update checks continue to work without transmitting local records.",
] as const;
