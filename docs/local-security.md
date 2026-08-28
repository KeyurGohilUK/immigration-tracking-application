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

The household-owner profile is the first encrypted personal-data record. Its
name and date of birth are JSON-encoded, encrypted with a fresh AES-GCM
initialisation vector, and stored in the IndexedDB `profiles` store. Stored
records are decrypted and structurally validated only after a successful PIN
unlock.

## Security boundary

A four-digit PIN has only 10,000 combinations. Key derivation and the interface
cooldown slow casual guessing but cannot prevent an attacker who has copied the
IndexedDB data from attempting every PIN offline. The app must not describe the
PIN as equivalent to a strong password, operating-system login, or full-device
encryption.

There is no PIN recovery or bypass. Recovery from a forgotten PIN will require
deleting the local vault and restoring a compatible backup using its correct
PIN. Backup and reset controls are separate future features.

The design does not protect an unlocked session from malicious browser
extensions, compromised devices, injected scripts, or a person who already has
access to the unlocked browser profile.
