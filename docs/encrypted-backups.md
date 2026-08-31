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
recover a forgotten backup password.

Document files are not included in the current JSON backup format. Users must
retain their original document files separately. Restoring a JSON backup
replaces tracker records only and leaves locally stored documents unchanged.

## Restore safety

Restore accepts JSON files no larger than 10 MB. Before decrypting or changing
local data, UrbanFox validates the wrapper format, schema, algorithms,
encryption parameters, and password. It then validates the encrypted payload,
owner and family profiles, profile identifiers, immigration permissions, trips,
and matching metadata.

The app shows the household name and record counts before replacement. The user
must acknowledge the replace-only behaviour and accept a final confirmation.
All restored records are re-encrypted with the current device's local PIN key,
then the profiles, permissions, and trips are replaced together in one
IndexedDB transaction. If encryption or the transaction fails, the previous
local records remain unchanged. The vault and local PIN are not replaced.
