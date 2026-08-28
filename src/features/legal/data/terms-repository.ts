import { CURRENT_TERMS_VERSION } from "../../../configuration/legal-metadata";
import {
  isCurrentTermsAcceptance,
  type TermsAcceptance,
} from "../domain/terms-acceptance";

const STORAGE_KEY = "urbanfox-ilr:terms-acceptance";

export function hasCurrentTermsAcceptance(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null && isCurrentTermsAcceptance(JSON.parse(stored));
  } catch {
    return false;
  }
}

export function saveCurrentTermsAcceptance(): TermsAcceptance {
  const acceptance = {
    version: CURRENT_TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acceptance));
  return acceptance;
}
