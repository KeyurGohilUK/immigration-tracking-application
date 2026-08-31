import { renderApp, renderSplash } from "./app";
import { renderLandingPage } from "../features/landing/components/landing-page";
import { renderMorePage } from "../features/settings/components/more-page";
import { wireDeleteDataDialog } from "../features/settings/components/delete-data-dialog";
import {
  BACKUP_PASSWORD_MINIMUM_LENGTH,
  MAXIMUM_BACKUP_FILE_BYTES,
  type BackupPayload,
  validateBackupPassword,
} from "../features/backup/domain/backup";
import {
  collectBackupData,
  createEncryptedBackup,
  decryptAndValidateBackup,
  downloadBackupFile,
  parseEncryptedBackupFile,
} from "../features/backup/services/backup-service";
import {
  replaceAllLocalData,
  summariseBackup,
} from "../features/backup/services/restore-service";
import {
  renderAbsenceSummary,
  renderAbsenceSummaryUnavailable,
} from "../features/calculation/components/absence-summary";
import { calculateRecordedAbsenceCheck } from "../features/calculation/domain/absence-calculation";
import { calculateSkilledWorkerQualifyingPeriod } from "../features/calculation/domain/qualifying-period-calculation";
import {
  readTripInput,
  renderTripsPage,
  showTripForm,
} from "../features/travel/components/trips-page";
import { getTrips, saveTrips } from "../features/travel/data/trip-repository";
import {
  findOverlappingTrip,
  validateTripInput,
  type Trip,
} from "../features/travel/domain/trip";
import {
  readImmigrationPermissionInput,
  renderImmigrationHistoryPage,
  showImmigrationPermissionForm,
  updateOtherRouteField,
} from "../features/immigration/components/immigration-history-page";
import {
  getImmigrationPermissions,
  saveImmigrationPermissions,
} from "../features/immigration/data/immigration-permission-repository";
import {
  getPermissionRouteLabel,
  validateImmigrationPermissionInput,
  type ImmigrationPermission,
} from "../features/immigration/domain/immigration-permission";
import { renderOwnerProfileForm } from "../features/household/components/owner-profile-form";
import {
  readFamilyMemberInput,
  renderFamilyPage,
  showFamilyMemberForm,
} from "../features/household/components/family-page";
import {
  isKnownProfileId,
  OWNER_PROFILE_ID,
} from "../features/household/components/person-switcher";
import {
  getFamilyMembers,
  saveFamilyMembers,
} from "../features/household/data/family-member-repository";
import {
  getOwnerProfile,
  saveOwnerProfile,
} from "../features/household/data/owner-profile-repository";
import {
  validateOwnerInput,
  type OwnerProfile,
} from "../features/household/domain/owner-profile";
import {
  validateFamilyMemberInput,
  type FamilyMember,
} from "../features/household/domain/family-member";
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
import { getUkCalendarDate } from "../shared/date/uk-calendar-date";

const SPLASH_DURATION_MS = 500;

export async function startApplication(root: HTMLElement): Promise<void> {
  let sessionKey: CryptoKey | null = null;
  let stopSessionLock: (() => void) | null = null;
  let selectedProfileId = OWNER_PROFILE_ID;

  const showTracker = async (
    key: CryptoKey,
    record: VaultRecord,
  ): Promise<void> => {
    sessionKey = key;
    let familyMembers: FamilyMember[] = [];
    let familyProfilesAvailable = true;
    const permissionCache = new Map<string, ImmigrationPermission[]>();
    const tripCache = new Map<string, Trip[]>();

    const lock = (): void => {
      if (!sessionKey) return;
      sessionKey = null;
      stopSessionLock?.();
      stopSessionLock = null;
      showPinEntry("unlock", record);
    };

    const wireAuthenticatedShell = (
      profile: OwnerProfile,
      currentView: "Home" | "Family" | "Permissions" | "Trips" | "More",
    ): void => {
      root
        .querySelector<HTMLButtonElement>('button[aria-label="Lock app"]')
        ?.addEventListener("click", lock);
      root
        .querySelector<HTMLAnchorElement>(".wordmark")
        ?.addEventListener("click", (event) => {
          event.preventDefault();
          renderDashboard(profile);
        });
      for (const link of root.querySelectorAll<HTMLAnchorElement>(
        "[data-navigation]",
      )) {
        const destination = link.dataset.navigation;
        if (destination === "Home") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            renderDashboard(profile);
          });
        }
        if (destination === "Family") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            showFamily(profile);
          });
        }
        if (destination === "Trips") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            void showTrips(profile);
          });
        }
        if (destination === "More") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            renderMore(profile);
          });
        }
      }
      root
        .querySelector<HTMLSelectElement>("#active-person")
        ?.addEventListener("change", (event) => {
          const profileId = (event.currentTarget as HTMLSelectElement).value;
          if (!isKnownProfileId(profileId, familyMembers)) return;
          selectedProfileId = profileId;
          if (currentView === "Family") renderFamily(profile, familyMembers);
          else if (currentView === "Permissions") void showPermissions(profile);
          else if (currentView === "Trips") void showTrips(profile);
          else renderDashboard(profile);
        });
      stopSessionLock?.();
      stopSessionLock = startSessionLock(lock);
    };

    const renderDashboard = (profile: OwnerProfile): void => {
      renderApp(root, profile, familyMembers, selectedProfileId);
      wireAuthenticatedShell(profile, "Home");
      wireDashboardActions(profile);
      const profileId = selectedProfileId;
      void updateDashboardCalculation(profile, profileId);
    };

    const renderMore = (profile: OwnerProfile): void => {
      renderMorePage(root, profile, familyMembers.length + 1);
      wireAuthenticatedShell(profile, "More");
      const backupDialog =
        root.querySelector<HTMLDialogElement>("#backup-dialog");
      const backupForm = root.querySelector<HTMLFormElement>("#backup-form");
      const restoreDialog =
        root.querySelector<HTMLDialogElement>("#restore-dialog");
      const restoreForm = root.querySelector<HTMLFormElement>("#restore-form");
      const restoreSummary =
        restoreForm?.querySelector<HTMLElement>("#restore-summary");
      const restoreConfirmation = restoreForm?.querySelector<HTMLInputElement>(
        "#restore-confirmation",
      );
      const replaceButton = restoreForm?.querySelector<HTMLButtonElement>(
        "#replace-local-data",
      );
      let reviewedBackup: BackupPayload | null = null;
      root
        .querySelector<HTMLButtonElement>("#lock-from-more")
        ?.addEventListener("click", lock);
      root
        .querySelector<HTMLButtonElement>("#open-install-settings")
        ?.addEventListener("click", () =>
          document
            .querySelector<HTMLButtonElement>(".app-manager-trigger")
            ?.click(),
        );
      root
        .querySelector<HTMLButtonElement>("#view-legal")
        ?.addEventListener("click", () =>
          showLegal(false, () => renderMore(profile)),
        );
      root
        .querySelector<HTMLButtonElement>("#create-backup")
        ?.addEventListener("click", () => {
          backupForm?.reset();
          const error =
            backupForm?.querySelector<HTMLElement>("#backup-form-error");
          if (error) error.hidden = true;
          backupDialog?.showModal();
        });
      backupDialog
        ?.querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => backupDialog.close());
      backupDialog?.addEventListener("click", (event) => {
        if (event.target === backupDialog) backupDialog.close();
      });
      backupForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(backupForm);
        const password = String(data.get("password") ?? "");
        const confirmation = String(data.get("confirmation") ?? "");
        const error =
          backupForm.querySelector<HTMLElement>("#backup-form-error");
        if (error) error.hidden = true;
        const validationError = validateBackupPassword(password, confirmation);
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const submit = backupForm.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Encrypting backup…";
        }
        try {
          const backupData = await collectBackupData(profile, key);
          const backup = await createEncryptedBackup(backupData, password);
          downloadBackupFile(backup);
          backupForm.reset();
          backupDialog?.close();
          const status = root.querySelector<HTMLElement>("#backup-status");
          if (status)
            status.textContent =
              "Encrypted backup downloaded. Store the file and password separately.";
        } catch {
          if (error) {
            error.textContent =
              "The encrypted backup could not be created. Your local data is unchanged.";
            error.hidden = false;
          }
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Download encrypted backup";
          }
        }
      });
      root
        .querySelector<HTMLButtonElement>("#restore-backup")
        ?.addEventListener("click", () => {
          reviewedBackup = null;
          restoreForm?.reset();
          if (restoreSummary) restoreSummary.hidden = true;
          if (replaceButton) replaceButton.disabled = true;
          const error = restoreForm?.querySelector<HTMLElement>(
            "#restore-form-error",
          );
          if (error) error.hidden = true;
          restoreDialog?.showModal();
        });
      restoreDialog
        ?.querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => restoreDialog.close());
      restoreDialog?.addEventListener("click", (event) => {
        if (event.target === restoreDialog) restoreDialog.close();
      });
      restoreConfirmation?.addEventListener("change", () => {
        if (replaceButton)
          replaceButton.disabled = !restoreConfirmation.checked;
      });
      restoreForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        reviewedBackup = null;
        if (restoreSummary) restoreSummary.hidden = true;
        if (restoreConfirmation) restoreConfirmation.checked = false;
        if (replaceButton) replaceButton.disabled = true;
        const error = restoreForm.querySelector<HTMLElement>(
          "#restore-form-error",
        );
        if (error) error.hidden = true;
        const data = new FormData(restoreForm);
        const fileInput =
          restoreForm.querySelector<HTMLInputElement>("#restore-file");
        const file = fileInput?.files?.[0];
        const password = String(data.get("password") ?? "");
        if (!file) {
          if (error) {
            error.textContent = "Choose an UrbanFox JSON backup file.";
            error.hidden = false;
          }
          return;
        }
        if (!file.name.toLowerCase().endsWith(".json")) {
          if (error) {
            error.textContent = "Choose a backup file ending in .json.";
            error.hidden = false;
          }
          return;
        }
        if (file.size === 0 || file.size > MAXIMUM_BACKUP_FILE_BYTES) {
          if (error) {
            error.textContent =
              "The backup file must be between 1 byte and 10 MB.";
            error.hidden = false;
          }
          return;
        }
        if (password.length < BACKUP_PASSWORD_MINIMUM_LENGTH) {
          if (error) {
            error.textContent = `Enter the backup password of at least ${BACKUP_PASSWORD_MINIMUM_LENGTH} characters.`;
            error.hidden = false;
          }
          return;
        }
        const reviewButton =
          restoreForm.querySelector<HTMLButtonElement>("#review-backup");
        if (reviewButton) {
          reviewButton.disabled = true;
          reviewButton.textContent = "Validating backup…";
        }
        try {
          const encrypted = parseEncryptedBackupFile(await file.text());
          const payload = await decryptAndValidateBackup(encrypted, password);
          const summary = summariseBackup(payload.data);
          reviewedBackup = payload;
          const owner =
            restoreForm.querySelector<HTMLElement>("#restore-owner");
          const people =
            restoreForm.querySelector<HTMLElement>("#restore-people");
          const permissions = restoreForm.querySelector<HTMLElement>(
            "#restore-permissions",
          );
          const trips =
            restoreForm.querySelector<HTMLElement>("#restore-trips");
          const exported =
            restoreForm.querySelector<HTMLElement>("#restore-exported");
          if (owner) owner.textContent = `Household: ${summary.ownerName}`;
          if (people) people.textContent = String(summary.people);
          if (permissions)
            permissions.textContent = String(summary.permissions);
          if (trips) trips.textContent = String(summary.trips);
          if (exported)
            exported.textContent = `Exported: ${new Date(payload.exportedAt).toLocaleString("en-GB")}`;
          if (restoreSummary) restoreSummary.hidden = false;
        } catch {
          if (error) {
            error.textContent =
              "The backup could not be opened. Check the file and backup password.";
            error.hidden = false;
          }
        } finally {
          if (reviewButton) {
            reviewButton.disabled = false;
            reviewButton.textContent = "Review backup";
          }
        }
      });
      replaceButton?.addEventListener("click", async () => {
        if (!reviewedBackup || !restoreConfirmation?.checked) return;
        if (
          !window.confirm(
            "Replace all household, permission, and trip records on this device with this backup?",
          )
        )
          return;
        replaceButton.disabled = true;
        replaceButton.textContent = "Restoring encrypted data…";
        try {
          await replaceAllLocalData(reviewedBackup.data, key);
          familyMembers = reviewedBackup.data.familyMembers;
          permissionCache.clear();
          tripCache.clear();
          selectedProfileId = OWNER_PROFILE_ID;
          const restoredOwner = reviewedBackup.data.owner;
          restoreDialog?.close();
          renderMore(restoredOwner);
          const status = root.querySelector<HTMLElement>("#backup-status");
          if (status)
            status.textContent =
              "Backup restored successfully. All restored records are encrypted with this device’s local PIN.";
        } catch {
          const error = restoreForm?.querySelector<HTMLElement>(
            "#restore-form-error",
          );
          if (error) {
            error.textContent =
              "Restore failed. Your previous local data remains unchanged.";
            error.hidden = false;
          }
          replaceButton.disabled = false;
          replaceButton.textContent = "Replace local data";
        }
      });
      wireDeleteDataDialog({
        context: "unlocked",
        root,
        triggerSelector: "#open-delete-data",
        onDeleted: () => {
          sessionKey = null;
          stopSessionLock?.();
          stopSessionLock = null;
          familyMembers = [];
          permissionCache.clear();
          tripCache.clear();
          selectedProfileId = OWNER_PROFILE_ID;
          showLanding(
            "All UrbanFox ILR data and the local PIN were deleted from this browser.",
          );
        },
      });
    };

    const wireDashboardActions = (profile: OwnerProfile): void => {
      root
        .querySelector<HTMLButtonElement>("#manage-permissions")
        ?.addEventListener("click", () => void showPermissions(profile));
      root
        .querySelector<HTMLButtonElement>("#manage-trips")
        ?.addEventListener("click", () => void showTrips(profile));
      root
        .querySelector<HTMLButtonElement>("#manage-family")
        ?.addEventListener("click", () => showFamily(profile));
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-select-dashboard-profile]",
      )) {
        button.addEventListener("click", () => {
          const profileId = button.dataset.selectDashboardProfile;
          if (!profileId || !isKnownProfileId(profileId, familyMembers)) return;
          selectedProfileId = profileId;
          renderDashboard(profile);
        });
      }
    };

    const renderFamily = (
      profile: OwnerProfile,
      members: FamilyMember[],
    ): void => {
      renderFamilyPage(root, profile, members, selectedProfileId);
      wireAuthenticatedShell(profile, "Family");
      const dialog = root.querySelector<HTMLDialogElement>("#family-dialog");
      const form = root.querySelector<HTMLFormElement>("#family-form");
      root
        .querySelector<HTMLButtonElement>("#add-family-member")
        ?.addEventListener("click", () => showFamilyMemberForm(root));
      root
        .querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => dialog?.close());
      dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-select-profile]",
      )) {
        button.addEventListener("click", () => {
          const profileId = button.dataset.selectProfile;
          if (!profileId || !isKnownProfileId(profileId, members)) return;
          selectedProfileId = profileId;
          renderFamily(profile, members);
        });
      }

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-edit-member]",
      )) {
        button.addEventListener("click", () => {
          const member = members.find(
            ({ id }) => id === button.dataset.editMember,
          );
          if (member) showFamilyMemberForm(root, member);
        });
      }

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-delete-member]",
      )) {
        button.addEventListener("click", async () => {
          const member = members.find(
            ({ id }) => id === button.dataset.deleteMember,
          );
          if (
            !member ||
            !window.confirm(
              `Delete ${member.fullName} from this local household? This cannot be undone.`,
            )
          )
            return;
          const nextMembers = members.filter(({ id }) => id !== member.id);
          try {
            await saveFamilyMembers(nextMembers, key);
            familyMembers = nextMembers;
            if (selectedProfileId === member.id)
              selectedProfileId = OWNER_PROFILE_ID;
            renderFamily(profile, nextMembers);
          } catch {
            const error = root.querySelector<HTMLElement>("#family-page-error");
            if (error) {
              error.textContent =
                "The family member could not be deleted. Your existing data is unchanged.";
              error.hidden = false;
            }
          }
        });
      }

      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { memberId, input } = readFamilyMemberInput(form);
        const validationError = validateFamilyMemberInput(input);
        const error = form.querySelector<HTMLElement>("#family-form-error");
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const existingMember = members.find(({ id }) => id === memberId);
        const timestamp = new Date().toISOString();
        const member: FamilyMember = {
          version: 1,
          id: existingMember?.id ?? crypto.randomUUID(),
          ...input,
          createdAt: existingMember?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const nextMembers = existingMember
          ? members.map((current) =>
              current.id === existingMember.id ? member : current,
            )
          : [...members, member];
        const submit = form.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveFamilyMembers(nextMembers, key);
          familyMembers = nextMembers;
          familyProfilesAvailable = true;
          if (!existingMember) selectedProfileId = member.id;
          dialog?.close();
          renderFamily(profile, nextMembers);
        } catch {
          if (error) {
            error.textContent =
              "This encrypted family profile could not be saved.";
            error.hidden = false;
          }
          if (submit) submit.disabled = false;
        }
      });
    };

    const showFamily = (profile: OwnerProfile): void => {
      renderFamily(profile, familyMembers);
      if (!familyProfilesAvailable) {
        const addMember =
          root.querySelector<HTMLButtonElement>("#add-family-member");
        if (addMember) addMember.disabled = true;
        const error = root.querySelector<HTMLElement>("#family-page-error");
        if (error) {
          error.textContent =
            "Your encrypted family profiles could not be opened.";
          error.hidden = false;
        }
      }
    };

    const renderPermissions = (
      profile: OwnerProfile,
      permissions: ImmigrationPermission[],
    ): void => {
      renderImmigrationHistoryPage(
        root,
        profile,
        familyMembers,
        selectedProfileId,
        permissions,
      );
      wireAuthenticatedShell(profile, "Permissions");
      const dialog =
        root.querySelector<HTMLDialogElement>("#permission-dialog");
      const form = root.querySelector<HTMLFormElement>("#permission-form");
      root
        .querySelector<HTMLButtonElement>("#back-to-dashboard")
        ?.addEventListener("click", () => renderDashboard(profile));
      root
        .querySelector<HTMLButtonElement>("#add-permission")
        ?.addEventListener("click", () => showImmigrationPermissionForm(root));
      root
        .querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => dialog?.close());
      dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      form
        ?.querySelector<HTMLSelectElement>("#permission-route")
        ?.addEventListener("change", () => updateOtherRouteField(form));

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-edit-permission]",
      )) {
        button.addEventListener("click", () => {
          const permission = permissions.find(
            ({ id }) => id === button.dataset.editPermission,
          );
          if (permission) showImmigrationPermissionForm(root, permission);
        });
      }

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-delete-permission]",
      )) {
        button.addEventListener("click", async () => {
          const permission = permissions.find(
            ({ id }) => id === button.dataset.deletePermission,
          );
          if (
            !permission ||
            !window.confirm(
              `Delete the ${getPermissionRouteLabel(permission)} permission? This cannot be undone.`,
            )
          )
            return;
          const nextPermissions = permissions.filter(
            ({ id }) => id !== permission.id,
          );
          try {
            await saveImmigrationPermissions(
              selectedProfileId,
              nextPermissions,
              key,
            );
            permissionCache.set(selectedProfileId, nextPermissions);
            renderPermissions(profile, nextPermissions);
          } catch {
            const error = root.querySelector<HTMLElement>(
              "#permission-page-error",
            );
            if (error) {
              error.textContent =
                "The permission could not be deleted. Your existing data is unchanged.";
              error.hidden = false;
            }
          }
        });
      }

      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { permissionId, input } = readImmigrationPermissionInput(form);
        const validationError = validateImmigrationPermissionInput(input);
        const error = form.querySelector<HTMLElement>("#permission-form-error");
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const existing = permissions.find(({ id }) => id === permissionId);
        const timestamp = new Date().toISOString();
        const permission: ImmigrationPermission = {
          version: 2,
          id: existing?.id ?? crypto.randomUUID(),
          profileId: selectedProfileId,
          ...input,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const nextPermissions = existing
          ? permissions.map((current) =>
              current.id === existing.id ? permission : current,
            )
          : [...permissions, permission];
        const submit = form.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveImmigrationPermissions(
            selectedProfileId,
            nextPermissions,
            key,
          );
          permissionCache.set(selectedProfileId, nextPermissions);
          dialog?.close();
          renderPermissions(profile, nextPermissions);
        } catch {
          if (error) {
            error.textContent =
              "This encrypted immigration permission could not be saved.";
            error.hidden = false;
          }
          if (submit) submit.disabled = false;
        }
      });
    };

    const showPermissions = async (profile: OwnerProfile): Promise<void> => {
      const cached = permissionCache.get(selectedProfileId);
      if (cached) {
        renderPermissions(profile, cached);
        return;
      }
      try {
        const permissions = await getImmigrationPermissions(
          selectedProfileId,
          key,
        );
        permissionCache.set(selectedProfileId, permissions);
        renderPermissions(profile, permissions);
      } catch {
        renderPermissions(profile, []);
        const add = root.querySelector<HTMLButtonElement>("#add-permission");
        if (add) add.disabled = true;
        const error = root.querySelector<HTMLElement>("#permission-page-error");
        if (error) {
          error.textContent =
            "This profile’s encrypted immigration permissions could not be opened.";
          error.hidden = false;
        }
      }
    };

    const renderTrips = (profile: OwnerProfile, trips: Trip[]): void => {
      renderTripsPage(root, profile, familyMembers, selectedProfileId, trips);
      wireAuthenticatedShell(profile, "Trips");
      const dialog = root.querySelector<HTMLDialogElement>("#trip-dialog");
      const form = root.querySelector<HTMLFormElement>("#trip-form");
      root
        .querySelector<HTMLButtonElement>("#add-trip")
        ?.addEventListener("click", () => showTripForm(root));
      root
        .querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => dialog?.close());
      dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-edit-trip]",
      )) {
        button.addEventListener("click", () => {
          const trip = trips.find(({ id }) => id === button.dataset.editTrip);
          if (trip) showTripForm(root, trip);
        });
      }

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-delete-trip]",
      )) {
        button.addEventListener("click", async () => {
          const trip = trips.find(({ id }) => id === button.dataset.deleteTrip);
          if (
            !trip ||
            !window.confirm(
              `Delete the trip to ${trip.destination}? This cannot be undone.`,
            )
          )
            return;
          const nextTrips = trips.filter(({ id }) => id !== trip.id);
          try {
            await saveTrips(selectedProfileId, nextTrips, key);
            tripCache.set(selectedProfileId, nextTrips);
            renderTrips(profile, nextTrips);
          } catch {
            const error = root.querySelector<HTMLElement>("#trip-page-error");
            if (error) {
              error.textContent =
                "The trip could not be deleted. Your existing data is unchanged.";
              error.hidden = false;
            }
          }
        });
      }

      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { tripId, input } = readTripInput(form);
        const error = form.querySelector<HTMLElement>("#trip-form-error");
        const validationError = validateTripInput(input);
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const overlap = findOverlappingTrip(input, trips, tripId);
        if (overlap) {
          if (error) {
            error.textContent = `This trip overlaps the existing trip to ${overlap.destination}. Edit the existing dates first.`;
            error.hidden = false;
          }
          return;
        }
        const existing = trips.find(({ id }) => id === tripId);
        const timestamp = new Date().toISOString();
        const trip: Trip = {
          version: 1,
          id: existing?.id ?? crypto.randomUUID(),
          profileId: selectedProfileId,
          ...input,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const nextTrips = existing
          ? trips.map((current) =>
              current.id === existing.id ? trip : current,
            )
          : [...trips, trip];
        const submit = form.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveTrips(selectedProfileId, nextTrips, key);
          tripCache.set(selectedProfileId, nextTrips);
          dialog?.close();
          renderTrips(profile, nextTrips);
        } catch {
          if (error) {
            error.textContent = "This encrypted trip could not be saved.";
            error.hidden = false;
          }
          if (submit) submit.disabled = false;
        }
      });
    };

    const showTrips = async (profile: OwnerProfile): Promise<void> => {
      const cached = tripCache.get(selectedProfileId);
      if (cached) {
        renderTrips(profile, cached);
        return;
      }
      try {
        const trips = await getTrips(selectedProfileId, key);
        tripCache.set(selectedProfileId, trips);
        renderTrips(profile, trips);
      } catch {
        renderTrips(profile, []);
        const add = root.querySelector<HTMLButtonElement>("#add-trip");
        if (add) add.disabled = true;
        const error = root.querySelector<HTMLElement>("#trip-page-error");
        if (error) {
          error.textContent =
            "This profile’s encrypted travel records could not be opened.";
          error.hidden = false;
        }
      }
    };

    const updateDashboardCalculation = async (
      profile: OwnerProfile,
      profileId: string,
    ): Promise<void> => {
      try {
        const cachedPermissions = permissionCache.get(profileId);
        const cachedTrips = tripCache.get(profileId);
        const [permissions, trips] = await Promise.all([
          cachedPermissions ?? getImmigrationPermissions(profileId, key),
          cachedTrips ?? getTrips(profileId, key),
        ]);
        permissionCache.set(profileId, permissions);
        tripCache.set(profileId, trips);
        if (
          selectedProfileId !== profileId ||
          !root.querySelector("#absence-summary")
        )
          return;
        const result = calculateRecordedAbsenceCheck({
          permissions,
          trips,
          asOfDate: getUkCalendarDate(),
        });
        const period = calculateSkilledWorkerQualifyingPeriod({
          permissions,
          asOfDate: getUkCalendarDate(),
        });
        renderAbsenceSummary(root, result, period);
        wireDashboardActions(profile);
      } catch {
        if (
          selectedProfileId !== profileId ||
          !root.querySelector("#absence-summary")
        )
          return;
        renderAbsenceSummaryUnavailable(root);
        wireDashboardActions(profile);
      }
    };

    try {
      const profile = await getOwnerProfile(key);
      if (profile) {
        try {
          familyMembers = await getFamilyMembers(key);
        } catch {
          familyMembers = [];
          familyProfilesAvailable = false;
        }
        if (!isKnownProfileId(selectedProfileId, familyMembers))
          selectedProfileId = OWNER_PROFILE_ID;
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

    if (mode === "unlock") {
      wireDeleteDataDialog({
        context: "locked",
        root,
        triggerSelector: "#forgot-pin-reset",
        onDeleted: () => {
          sessionKey = null;
          stopSessionLock?.();
          stopSessionLock = null;
          selectedProfileId = OWNER_PROFILE_ID;
          showLanding(
            "The previous local data and PIN were deleted. You can now create a new private space.",
          );
        },
      });
    }

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

  const showLegal = (
    acceptanceRequired: boolean,
    backAction?: () => void,
  ): void => {
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
      ?.addEventListener("click", backAction ?? (() => showLanding()));
  };

  const showLanding = (statusMessage?: string): void => {
    renderLandingPage(root);
    const status = root.querySelector<HTMLElement>("#landing-status");
    if (statusMessage && status) {
      status.textContent = statusMessage;
      status.hidden = false;
    }
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
