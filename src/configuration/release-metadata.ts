export const APP_VERSION = "3.25.7";

export const RELEASE_NOTES = [
  "Encrypted backup restore now supports every backup schema actually shipped by UrbanFox, from data schema 4 through schema 7.",
  "Schema 4 owner/family backups are migrated into the current household-member model, while later schemas receive safe empty collections for features that did not yet exist.",
  "Pre-backup schemas and future unsupported schema versions remain explicitly rejected instead of being guessed or partially restored.",
] as const;
