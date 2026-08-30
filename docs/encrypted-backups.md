# Encrypted backups

UrbanFox ILR can export the current household owner, family members,
immigration permissions, and trips as one downloadable JSON file. The app does
not upload the file or password.

## Security model

The readable wrapper contains only the backup format version, application
version, data-schema version, export timestamp, and encryption parameters. All
personal records are encoded as JSON and encrypted with AES-256-GCM.

The encryption key is derived from a user-selected backup password with
PBKDF2-HMAC-SHA-256, a random 16-byte salt, and 600,000 iterations. Every export
also uses a new random 12-byte initialization vector. The backup password is
never stored and is separate from the four-digit local PIN.

Users must keep the backup file and password safe and separate. UrbanFox cannot
recover a forgotten backup password. The current release exports backups only;
restore will be implemented as a separately validated, replace-only workflow.
