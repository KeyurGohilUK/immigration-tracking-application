# Local PIN and encrypted vault

UrbanFox ILR has no online account or server-side authentication. Creating an
account means creating a private vault in the browser on the current device.

## Current design

- The user creates a four-digit PIN and confirms it locally.
- The browser generates a random 256-bit master encryption key. Personal data
  is encrypted with this key using AES-GCM and a fresh initialisation vector for
  each record.
- PBKDF2-SHA-256 derives a wrapping key from the PIN using a random 16-byte salt
  and 310,000 iterations. That wrapping key encrypts the master key; the PIN,
  wrapping key, and plaintext master key are never persisted.
- IndexedDB stores only the derivation parameters, encrypted master key, and an
  encrypted fixed verifier. Successful unlock unwraps a non-exportable
  `CryptoKey` and keeps it in memory only.
- The key is discarded when the user locks the app, refreshes or closes the
  page, sends the page to the background, or remains inactive for five minutes.
- Five consecutive failed attempts trigger a 30-second interface cooldown.

Vaults created before version 3.26.0 used the PIN-derived AES key directly for
data encryption. The first successful PIN unlock migrates only the vault
metadata: the existing key bytes become the master key and are wrapped by a new
PIN-derived wrapping key. Existing encrypted records are not decrypted,
rewritten, or deleted during this migration. If the metadata write fails, the
legacy vault remains usable through its PIN.

## Optional Device Unlock

After a successful PIN unlock, a user can enable Device Unlock in Profile &
settings. UrbanFox requests a platform WebAuthn credential with user
verification and the WebAuthn PRF extension. On supported Apple devices, the
operating system can satisfy that request with Face ID, Touch ID, or the device
passcode. Other platforms use their secure device authentication.

The authenticator's credential-bound PRF output is passed through HKDF-SHA-256
and used as a second AES-GCM wrapping key for the same master key. IndexedDB
stores the credential identifier, random PRF input, HKDF salt, initialisation
vector, and encrypted master key. It never stores biometric information, a
plaintext master key, or the PRF output. UrbanFox does not upload any of these
values.

An ordinary WebAuthn success flag is not sufficient to unlock encrypted data.
Device Unlock succeeds only when the authenticator reproduces the secret needed
to unwrap the master key and that key decrypts the vault verifier. Cancellation,
a missing credential, or loss of browser support leaves the app locked with
immediate PIN fallback. Device Unlock cannot reset or recover the PIN.

Device Unlock is progressive enhancement. It requires a secure context, a
user-verifying platform authenticator, and WebAuthn PRF support (including
Safari 18 or later where supported by the Apple device and configuration).
Enrollment remains stored across normal reloads and service-worker updates
because it is separate from cache data. Clearing site data, resetting UrbanFox,
or removing the platform credential disables it without making PIN unlock or
encrypted data inaccessible.

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
