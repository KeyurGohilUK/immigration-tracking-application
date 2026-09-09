export const APP_VERSION = "3.26.0";

export const RELEASE_NOTES = [
  "Optional Device Unlock uses Face ID, Touch ID, or other secure device authentication while keeping the four-digit PIN as the required fallback.",
  "Local vaults now use a random master encryption key wrapped by the PIN, with a backward-compatible migration that leaves existing encrypted data unchanged.",
] as const;
