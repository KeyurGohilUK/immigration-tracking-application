# UK postcode address lookup

Address History uses Ideal Postcodes for optional postcode-first UK address
capture. The rest of the Address History record continues to be stored in the
encrypted local vault.

## User flow

1. Enter a UK postcode.
2. Choose **Find address**.
3. Select the matching postal address.
4. Add the move-in / move-out month and optional evidence.
5. Save as normal.

Manual address entry remains available. If lookup is not configured, fails, or
returns no matches, the form falls back to manual entry rather than blocking the
Address History workflow.

## Configuration

The browser build reads:

```text
VITE_IDEAL_POSTCODES_API_KEY
```

Production GitHub Pages deployment maps this from the repository Actions secret:

```text
IDEAL_POSTCODES_API_KEY
```

Use a browser/public Ideal Postcodes key and restrict its Allowed URLs to the
production GitHub Pages origin. Also set appropriate daily/individual lookup
limits in the provider dashboard. Do not commit the key to the repository.

The key is embedded in the browser bundle by design, so URL restrictions and
provider-side usage limits are the security boundary. It must not be treated as
a server-side secret.

## Privacy

A lookup sends the postcode entered by the user to the Ideal Postcodes API.
UrbanFox does not send the selected full address back to an UrbanFox server and
does not create an online application database. The selected address is saved
only when the user submits the Address History form, using the existing
encrypted local storage.

The Terms and privacy screen explains this external lookup explicitly.

## Failure behaviour

- Invalid postcode: rejected locally before any request.
- Missing deployment key: manual entry is shown.
- Provider/network failure: the error is shown and manual entry is enabled.
- Empty result: manual entry is enabled.
- Existing address edit: manual editing remains available, with postcode lookup
  offered as a replacement route.

## Verification

Unit tests cover postcode normalisation, validation, provider-response mapping,
and failure before network access. Existing Address History Playwright coverage
continues to exercise the manual fallback path in CI when no provider key is
configured.
