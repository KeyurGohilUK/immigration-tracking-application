import { renderApp, renderSplash } from "./app";
import { renderLandingPage } from "../features/landing/components/landing-page";
import { renderOwnerProfileForm } from "../features/household/components/owner-profile-form";
import {
  getOwnerProfile,
  saveOwnerProfile,
} from "../features/household/data/owner-profile-repository";
import {
  validateOwnerInput,
  type OwnerProfile,
} from "../features/household/domain/owner-profile";
import { renderLegalScreen } from "../features/legal/components/legal-screen";
import {
  hasCurrentTermsAcceptance,
  saveCurrentTermsAcceptance,
} from "../features/legal/data/terms-repository";
import {
  clearPinInputs,
  renderPinScreen,
  setPinFormBusy,
  showPinError,
  type PinScreenMode,
} from "../features/security/components/pin-screen";
import {
  getVaultRecord,
  saveVaultRecord,
} from "../features/security/data/vault-repository";
import { isValidPin } from "../features/security/domain/pin";
import { startSessionLock } from "../features/security/services/session-lock";
import {
  createVault,
  unlockVault,
  type VaultRecord,
} from "../features/security/services/vault-crypto";

const SPLASH_DURATION_MS = 500;

export async function startApplication(root: HTMLElement): Promise<void> {
  let sessionKey: CryptoKey | null = null;
  let stopSessionLock: (() => void) | null = null;

  const showTracker = async (
    key: CryptoKey,
    record: VaultRecord,
  ): Promise<void> => {
    sessionKey = key;
    const renderDashboard = (profile: OwnerProfile): void => {
      renderApp(root, profile.fullName);
      const lock = (): void => {
        if (!sessionKey) return;
        sessionKey = null;
        stopSessionLock?.();
        stopSessionLock = null;
        showPinEntry("unlock", record);
      };
      root
        .querySelector<HTMLButtonElement>('button[aria-label="Lock app"]')
        ?.addEventListener("click", lock);
      stopSessionLock = startSessionLock(lock);
    };

    try {
      const profile = await getOwnerProfile(key);
      if (profile) {
        renderDashboard(profile);
        return;
      }
      const form = renderOwnerProfileForm(root);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const fullName = String(data.get("fullName") ?? "").trim();
        const dateOfBirth = String(data.get("dateOfBirth") ?? "");
        const error = validateOwnerInput(fullName, dateOfBirth);
        const errorElement = form.querySelector<HTMLElement>("#owner-error");
        if (error) {
          if (errorElement) {
            errorElement.textContent = error;
            errorElement.hidden = false;
          }
          return;
        }
        const timestamp = new Date().toISOString();
        const owner: OwnerProfile = {
          version: 1,
          id: "owner",
          fullName,
          dateOfBirth,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        try {
          await saveOwnerProfile(owner, key);
          renderDashboard(owner);
        } catch {
          if (errorElement) {
            errorElement.textContent =
              "Your encrypted profile could not be saved.";
            errorElement.hidden = false;
          }
        }
      });
    } catch {
      renderPinScreen(root, "unlock");
      const form = root.querySelector<HTMLFormElement>("#pin-form");
      if (form) {
        setPinFormBusy(form, true);
        showPinError(form, "Your encrypted profile could not be opened.");
      }
    }
  };

  const showPinEntry = (
    mode: PinScreenMode,
    existingRecord?: VaultRecord,
  ): void => {
    const form = renderPinScreen(root, mode);
    let failedAttempts = 0;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const pin = String(data.get("pin") ?? "");

      if (!isValidPin(pin)) {
        showPinError(form, "Enter exactly four digits.");
        return;
      }

      if (mode === "create") {
        const confirmation = String(data.get("confirmPin") ?? "");
        if (pin !== confirmation) {
          showPinError(form, "The PINs do not match.");
          return;
        }
      }

      setPinFormBusy(form, true);
      try {
        if (mode === "create") {
          const vault = await createVault(pin);
          await saveVaultRecord(vault.record);
          await showTracker(vault.key, vault.record);
          return;
        }

        if (!existingRecord) {
          throw new Error("The encrypted vault could not be found.");
        }
        const key = await unlockVault(pin, existingRecord);
        if (key) {
          await showTracker(key, existingRecord);
          return;
        }

        failedAttempts += 1;
        showPinError(form, "That PIN could not unlock this private space.");
        clearPinInputs(form);
        if (failedAttempts >= 5) {
          showPinError(form, "Too many attempts. Try again in 30 seconds.");
          window.setTimeout(() => {
            failedAttempts = 0;
            setPinFormBusy(form, false);
          }, 30_000);
          return;
        }
      } catch {
        showPinError(
          form,
          "Private storage is unavailable. Your PIN was not saved.",
        );
      }

      setPinFormBusy(form, false);
    });
  };

  const continueToPin = async (): Promise<void> => {
    try {
      const record = await getVaultRecord();
      showPinEntry(record ? "unlock" : "create", record ?? undefined);
    } catch {
      showPinEntry("create");
      const form = root.querySelector<HTMLFormElement>("#pin-form");
      if (form) {
        setPinFormBusy(form, true);
        showPinError(form, "Private storage is unavailable in this browser.");
      }
    }
  };

  const showLegal = (acceptanceRequired: boolean): void => {
    renderLegalScreen(root, acceptanceRequired);
    if (acceptanceRequired) {
      root
        .querySelector<HTMLFormElement>("#terms-form")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          try {
            saveCurrentTermsAcceptance();
            void continueToPin();
          } catch {
            const form = event.currentTarget as HTMLFormElement;
            const button = form.querySelector<HTMLButtonElement>(
              'button[type="submit"]',
            );
            if (button) button.textContent = "Acceptance could not be saved";
          }
        });
      return;
    }
    root
      .querySelector<HTMLButtonElement>("#legal-back")
      ?.addEventListener("click", showLanding);
  };

  const showLanding = (): void => {
    renderLandingPage(root);
    root
      .querySelector<HTMLButtonElement>("#get-started")
      ?.addEventListener("click", () => {
        if (hasCurrentTermsAcceptance()) void continueToPin();
        else showLegal(true);
      });
    for (const link of root.querySelectorAll<HTMLButtonElement>(
      "[data-legal-view]",
    )) {
      link.addEventListener("click", () => showLegal(false));
    }
  };

  renderSplash(root);
  await new Promise((resolve) =>
    window.setTimeout(resolve, SPLASH_DURATION_MS),
  );
  try {
    const record = await getVaultRecord();
    if (record) {
      showPinEntry("unlock", record);
      return;
    }
  } catch {
    // The normal setup flow will display a storage error if the user continues.
  }
  showLanding();
}
