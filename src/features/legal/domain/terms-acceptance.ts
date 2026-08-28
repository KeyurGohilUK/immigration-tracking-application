import { CURRENT_TERMS_VERSION } from "../../../configuration/legal-metadata";

export interface TermsAcceptance {
  version: string;
  acceptedAt: string;
}

export function isCurrentTermsAcceptance(
  value: unknown,
): value is TermsAcceptance {
  if (!value || typeof value !== "object") return false;
  const acceptance = value as Partial<TermsAcceptance>;
  return (
    acceptance.version === CURRENT_TERMS_VERSION &&
    typeof acceptance.acceptedAt === "string" &&
    !Number.isNaN(Date.parse(acceptance.acceptedAt))
  );
}
