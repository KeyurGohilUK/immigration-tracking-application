export interface UkAddressSuggestion {
  id: string;
  label: string;
  fullAddress: string;
}

interface IdealPostcodesAddress {
  udprn?: number | string;
  uprn?: number | string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  post_town?: string;
  county?: string;
  postcode?: string;
}

interface IdealPostcodesResponse {
  result?: unknown;
  message?: string;
}

const POSTCODE_PATTERN =
  /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;

export function normalizeUkPostcode(value: string): string {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "");
  if (compact.length < 4) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function validateUkPostcode(value: string): string | null {
  const postcode = normalizeUkPostcode(value);
  return POSTCODE_PATTERN.test(postcode)
    ? null
    : "Enter a valid UK postcode, for example BS1 5AH.";
}

export function isUkAddressLookupConfigured(): boolean {
  return Boolean(import.meta.env.VITE_IDEAL_POSTCODES_API_KEY?.trim());
}

export async function lookupUkAddresses(
  postcodeInput: string,
): Promise<UkAddressSuggestion[]> {
  const validationError = validateUkPostcode(postcodeInput);
  if (validationError) throw new Error(validationError);

  const apiKey = import.meta.env.VITE_IDEAL_POSTCODES_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Postcode lookup is not configured on this deployment. Enter the address manually.",
    );
  }

  const postcode = normalizeUkPostcode(postcodeInput);
  const response = await fetch(
    `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(postcode)}?api_key=${encodeURIComponent(apiKey)}`,
    {
      headers: { Accept: "application/json" },
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | IdealPostcodesResponse
    | null;

  if (!response.ok) {
    const message =
      payload?.message?.trim() ||
      (response.status === 404
        ? "No addresses were found for that postcode."
        : "Address lookup is temporarily unavailable.");
    throw new Error(message);
  }

  if (!Array.isArray(payload?.result)) {
    throw new Error("Address lookup returned an unexpected response.");
  }

  return payload.result
    .map((value, index) => toSuggestion(value, index))
    .filter((value): value is UkAddressSuggestion => value !== null);
}

function toSuggestion(
  value: unknown,
  index: number,
): UkAddressSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const address = value as IdealPostcodesAddress;
  const postcode = normalizeUkPostcode(address.postcode ?? "");
  const parts = [
    address.line_1,
    address.line_2,
    address.line_3,
    address.post_town,
    address.county,
    postcode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length < 2) return null;

  const fullAddress = parts.join(", ");
  const stableId = String(address.udprn ?? address.uprn ?? index);

  return {
    id: stableId,
    label: fullAddress,
    fullAddress,
  };
}
