# Local PIN and encrypted vault

UrbanFox ILR has no online account or server-side authentication. Creating an
account means creating a private vault in the browser on the current device.

## Current design

- The user creates a four-digit PIN and confirms it locally.
- PBKDF2-SHA-256 derives a non-exportable 256-bit AES-GCM key from the PIN using
  a random 16-byte salt and 310,000 iterations.
- IndexedDB stores the salt, iteration count, random initialisation vector, and
  an encrypted fixed verifier. It does not store the PIN or derived key.
- Successful unlock keeps the `CryptoKey` in memory only.
- The key is discarded when the user locks the app, refreshes or closes the
  page, sends the page to the background, or remains inactive for five minutes.
- Five consecutive failed attempts trigger a 30-second interface cooldown.

Future personal-data records must be encrypted with the in-memory key and a
fresh AES-GCM initialisation vector per encryption operation.

Household-owner and family-member profiles are JSON-encoded, encrypted with a
fresh AES-GCM initialisation vector, and stored in the IndexedDB `profiles`
store. Immigration permissions use the separate `permissions` store and are
encrypted independently for each profile identifier. Travel history uses a
separate `trips` store with the same per-profile encryption boundary. Stored
records are decrypted and structurally validated only after a successful PIN
unlock.

The same domain validators run before every encrypted save. They reject
malformed identifiers, non-canonical timestamps or text, records updated before
creation, mixed profile associations, duplicate identifiers, impossible dates,
and overlapping travel records before IndexedDB is changed.

IndexedDB schema version 5 adds the `documents` store without rewriting or
deleting the existing `security`, `profiles`, `permissions`, or `trips` stores.
Document metadata and file bytes are encrypted separately with the unlocked
vault key, and files are decrypted only when opened or downloaded. Every
decrypted domain record also carries its own version and is rejected if its structure,
version, profile association, date ordering, or identifier uniqueness is
invalid. Version 1 immigration-permission records are migrated in memory to
version 2 with an empty grant date, so existing encrypted history remains
readable and the calculation safely requests the missing date.

## Security boundary

A four-digit PIN has only 10,000 combinations. Key derivation and the interface
cooldown slow casual guessing but cannot prevent an attacker who has copied the
IndexedDB data from attempting every PIN offline. The app must not describe the
PIN as equivalent to a strong password, operating-system login, or full-device
encryption.

There is no PIN recovery or bypass. The locked screen provides a forgotten-PIN
reset, and the More screen provides the same deletion flow while unlocked. Both
require the user to type `DELETE` and accept a final confirmation before the app
clears encrypted records, the local PIN vault, and Terms acceptance. This cannot
be undone. A user who may need their records must already have an encrypted
backup and its separate password before resetting from the locked screen.

The design does not protect an unlocked session from malicious browser
extensions, compromised devices, injected scripts, or a person who already has
access to the unlocked browser profile.
