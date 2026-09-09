export const APP_VERSION = "3.26.1";

export const RELEASE_NOTES = [
  "What needs attention now explains the next action, opens the relevant UrbanFox flow directly, and links to official GOV.UK guidance where useful.",
  "Optional Device Unlock uses Face ID, Touch ID, or other secure device authentication while keeping the four-digit PIN as the required fallback.",
  "Local vaults now use a random master encryption key wrapped by the PIN, with a backward-compatible migration that leaves existing encrypted data unchanged.",
] as const;
