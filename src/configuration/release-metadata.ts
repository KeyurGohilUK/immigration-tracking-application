export const APP_VERSION = "3.25.2";

export const RELEASE_NOTES = [
  "PIN security regression coverage now includes setup confirmation, correct and incorrect unlocks, five-attempt cooldown, manual lock, inactivity auto-lock, reload lock, and forgotten-PIN reset.",
  "Forgotten-PIN reset browser tests now verify that both the local vault record and encrypted household profile data are actually removed.",
  "The five-minute inactivity timeout is now exported for deterministic lifecycle testing without changing runtime behaviour.",
] as const;
