import { renderApp, renderSplash } from "./app";
import { renderLandingPage } from "../features/landing/components/landing-page";
import { renderMorePage } from "../features/settings/components/more-page";
import {
  setThemePreference,
  type ThemePreference,
} from "../features/settings/services/theme-preference";
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
import {
  calculateRecordedAbsenceCheck,
  calculateRecordedDependantAbsenceCheck,
} from "../features/calculation/domain/absence-calculation";
import { calculateSkilledWorkerDependantQualifyingPeriod } from "../features/calculation/domain/dependant-qualifying-period-calculation";
import { calculateSkilledWorkerQualifyingPeriod } from "../features/calculation/domain/qualifying-period-calculation";
import {
  readTripInput,
  renderTripsPage,
  showTripForm,
  type TravelOverview,
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
import { renderFirstMemberForm } from "../features/household/components/first-member-form";
import {
  readHouseholdMemberInput,
  showHouseholdMemberForm,
} from "../features/household/components/member-profile-dialog";
import { isKnownProfileId } from "../features/household/components/person-switcher";
import {
  getHouseholdMembers,
  saveHouseholdMembers,
} from "../features/household/data/household-member-repository";
import {
  validateHouseholdMemberInput,
  type HouseholdMember,
} from "../features/household/domain/household-member";
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
import {
  readDocumentRenameForm,
  readDocumentUploadForm,
  renderDocumentsPage,
  showDocumentRenameForm,
  showDocumentUploadForm,
  suggestDocumentName,
} from "../features/documents/components/documents-page";
import {
  readAddressHistoryForm,
  resetAddressHistoryForm,
  showAddressHistoryForm,
  syncAddressEndState,
} from "../features/documents/components/address-history-dialog";
import {
  readLifeEnglishForm,
  showLifeEnglishForm,
  syncLifeEnglishForm,
} from "../features/documents/components/life-english-dialog";
import {
  deleteDocument,
  getAllDocumentMetadata,
  getDocumentFile,
  saveDocument,
  saveDocumentMetadataBatch,
} from "../features/documents/data/document-repository";
import {
  MAXIMUM_DOCUMENTS_PER_PROFILE,
  MAXIMUM_TOTAL_DOCUMENT_BYTES,
  resolveDocumentMimeType,
  validateDocumentName,
  validateDocumentSignature,
  validateDocumentUploadInput,
  type DocumentMetadata,
} from "../features/documents/domain/document";
import {
  createDocumentPack,
  downloadDocumentPack,
} from "../features/documents/services/document-pack-service";
import {
  getAddressHistory,
  saveAddressHistory,
} from "../features/documents/data/address-history-repository";
import {
  getLifeEnglishRecord,
  saveLifeEnglishRecord,
} from "../features/documents/data/life-english-repository";
import {
  calculateAddressHistoryCoverage,
  getRequiredAddressHistoryMonths,
  validateAddressHistoryCollection,
  validateAddressHistoryInput,
  type AddressHistoryEntry,
} from "../features/documents/domain/address-history";
import {
  validateLifeEnglishInput,
  type LifeEnglishRecord,
} from "../features/documents/domain/life-english";
import { getDefaultCategoryForSection } from "../features/documents/domain/document-vault";
import {
  renderIlrJourneyPage,
  type IlrJourneyMember,
} from "../features/ilr/components/ilr-journey-page";

const SPLASH_DURATION_MS = 500;

export async function startApplication(root: HTMLElement): Promise<void> {
  let sessionKey: CryptoKey | null = null;
  let stopSessionLock: (() => void) | null = null;
  let selectedProfileId = "";

  const showTracker = async (
    key: CryptoKey,
    record: VaultRecord,
  ): Promise<void> => {
    sessionKey = key;
    let familyMembers: HouseholdMember[] = [];
    let familyProfilesAvailable = true;
    const permissionCache = new Map<string, ImmigrationPermission[]>();
    const tripCache = new Map<string, Trip[]>();
    const addressHistoryCache = new Map<string, AddressHistoryEntry[]>();
    const lifeEnglishCache = new Map<string, LifeEnglishRecord | null>();

    const lock = (): void => {
      if (!sessionKey) return;
      sessionKey = null;
      stopSessionLock?.();
      stopSessionLock = null;
      showPinEntry("unlock", record);
    };

    const wireAuthenticatedShell = (
      profile: HouseholdMember,
      currentView:
        "Home" | "Permissions" | "Trips" | "ILR" | "Documents" | "More",
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
        if (destination === "Trips") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            void showTrips(profile);
          });
        }
        if (destination === "ILR") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            void showIlrJourney(profile);
          });
        }
        if (destination === "Documents") {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            void showDocuments(profile);
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
          const selectedMember = familyMembers.find(
            ({ id }) => id === profileId,
          );
          if (!selectedMember) return;
          if (currentView === "Permissions")
            void showPermissions(selectedMember);
          else if (currentView === "Trips") void showTrips(selectedMember);
          else if (currentView === "ILR") void showIlrJourney(selectedMember);
          else if (currentView === "Documents")
            void showDocuments(selectedMember);
          else renderDashboard(selectedMember);
        });
      stopSessionLock?.();
      stopSessionLock = startSessionLock(lock);
    };

    const renderDashboard = (profile: HouseholdMember): void => {
      renderApp(root, familyMembers, selectedProfileId);
      wireAuthenticatedShell(profile, "Home");
      wireDashboardActions(profile);
      const profileId = selectedProfileId;
      void updateDashboardCalculation(profile, profileId);
    };

    const showIlrJourney = async (profile: HouseholdMember): Promise<void> => {
      const asOfDate = getUkCalendarDate();
      const journeys = await Promise.all(
        familyMembers.map(async (member): Promise<IlrJourneyMember> => {
          let permissions = permissionCache.get(member.id);
          let trips = tripCache.get(member.id);
          try {
            if (!permissions)
              permissions = await getImmigrationPermissions(member.id, key);
          } catch {
            permissions = [];
          }
          try {
            if (!trips) trips = await getTrips(member.id, key);
          } catch {
            trips = [];
          }
          permissionCache.set(member.id, permissions);
          tripCache.set(member.id, trips);

          const latestPermission = [...permissions].sort((left, right) =>
            right.permissionStartDate.localeCompare(left.permissionStartDate),
          )[0];
          const isDependant =
            latestPermission?.role === "dependant" ||
            member.immigrationRole === "dependant";
          const absenceInput = {
            permissions,
            trips,
            asOfDate,
          };

          return {
            member,
            period: isDependant
              ? calculateSkilledWorkerDependantQualifyingPeriod(
                  permissions,
                  asOfDate,
                )
              : calculateSkilledWorkerQualifyingPeriod({
                  permissions,
                  asOfDate,
                }),
            absence: isDependant
              ? calculateRecordedDependantAbsenceCheck(absenceInput)
              : calculateRecordedAbsenceCheck(absenceInput),
          };
        }),
      );
      renderIlrJourneyPage(root, journeys, asOfDate);
      wireAuthenticatedShell(profile, "ILR");
    };

    const renderMore = (profile: HouseholdMember): void => {
      renderMorePage(root, familyMembers.length);
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
        .querySelector<HTMLSelectElement>("#theme-preference")
        ?.addEventListener("change", (event) => {
          const preference = (event.currentTarget as HTMLSelectElement)
            .value as ThemePreference;
          setThemePreference(preference);
        });
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
          const backupData = await collectBackupData(key);
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
              "The backup file must be between 1 byte and 140 MB.";
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
          const people =
            restoreForm.querySelector<HTMLElement>("#restore-people");
          const permissions = restoreForm.querySelector<HTMLElement>(
            "#restore-permissions",
          );
          const trips =
            restoreForm.querySelector<HTMLElement>("#restore-trips");
          const documents =
            restoreForm.querySelector<HTMLElement>("#restore-documents");
          const replacementGuidance = restoreForm.querySelector<HTMLElement>(
            "#restore-replacement-guidance",
          );
          const exported =
            restoreForm.querySelector<HTMLElement>("#restore-exported");
          if (people) people.textContent = String(summary.people);
          if (permissions)
            permissions.textContent = String(summary.permissions);
          if (trips) trips.textContent = String(summary.trips);
          if (documents)
            documents.textContent = summary.includesDocuments
              ? String(summary.documents)
              : "Not in legacy backup";
          if (replacementGuidance)
            replacementGuidance.innerHTML = summary.includesDocuments
              ? "<strong>This replaces current local tracker records and documents.</strong> Create a fresh backup first if you may need the data currently on this device."
              : "<strong>This legacy backup replaces tracker records only.</strong> Existing local documents remain unchanged.";
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
            reviewedBackup.data.documents === undefined
              ? "Replace household, permission, and trip records with this legacy backup? Existing documents will remain unchanged."
              : "Replace all household, permission, trip, and document records on this device with this backup?",
          )
        )
          return;
        replaceButton.disabled = true;
        replaceButton.textContent = "Restoring encrypted data…";
        try {
          await replaceAllLocalData(reviewedBackup.data, key);
          familyMembers = reviewedBackup.data.members;
          permissionCache.clear();
          tripCache.clear();
          selectedProfileId = familyMembers[0]?.id ?? "";
          restoreDialog?.close();
          const currentMember = familyMembers[0];
          if (currentMember) renderMore(currentMember);
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
          selectedProfileId = familyMembers[0]?.id ?? "";
          showLanding(
            "All UrbanFox ILR data and the local PIN were deleted from this browser.",
          );
        },
      });
    };

    const showDocumentPageError = (message: string): void => {
      const error = root.querySelector<HTMLElement>("#document-page-error");
      if (!error) return;
      error.textContent = message;
      error.hidden = false;
    };

    const downloadDecryptedDocument = async (
      documentId: string,
      openInNewTab: boolean,
    ): Promise<void> => {
      const preview = openInNewTab
        ? window.open("about:blank", "_blank", "noopener")
        : null;
      try {
        const document = await getDocumentFile(documentId, key);
        const blob = new Blob([document.bytes], {
          type: document.metadata.mimeType,
        });
        const url = URL.createObjectURL(blob);
        if (openInNewTab && preview) preview.location.href = url;
        else {
          const link = window.document.createElement("a");
          link.href = url;
          link.download = document.metadata.fileName;
          link.click();
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
        preview?.close();
        showDocumentPageError(
          "The document could not be decrypted. Your stored file is unchanged.",
        );
      }
    };

    const renderDocuments = (
      profile: HouseholdMember,
      documents: DocumentMetadata[],
      addressHistory: AddressHistoryEntry[],
      requiredAddressMonths: number | null,
      lifeEnglish: LifeEnglishRecord | null,
    ): void => {
      const addressCoverage = calculateAddressHistoryCoverage(
        addressHistory,
        requiredAddressMonths,
        getUkCalendarDate().slice(0, 7),
      );
      renderDocumentsPage(
        root,
        familyMembers,
        selectedProfileId,
        documents,
        addressHistory,
        addressCoverage,
        lifeEnglish,
      );
      wireAuthenticatedShell(profile, "Documents");
      const uploadDialog =
        root.querySelector<HTMLDialogElement>("#document-dialog");
      const uploadForm = root.querySelector<HTMLFormElement>("#document-form");
      const renameDialog = root.querySelector<HTMLDialogElement>(
        "#document-rename-dialog",
      );
      const renameForm = root.querySelector<HTMLFormElement>(
        "#document-rename-form",
      );
      const addressDialog = root.querySelector<HTMLDialogElement>(
        "#address-history-dialog",
      );
      const addressForm = root.querySelector<HTMLFormElement>(
        "#address-history-form",
      );
      const lifeEnglishDialog = root.querySelector<HTMLDialogElement>(
        "#life-english-dialog",
      );
      const lifeEnglishForm =
        root.querySelector<HTMLFormElement>("#life-english-form");
      root
        .querySelector<HTMLButtonElement>("#download-document-pack")
        ?.addEventListener("click", async (event) => {
          const button = event.currentTarget as HTMLButtonElement;
          const selectedDocuments = documents
            .filter(({ profileId }) => profileId === selectedProfileId)
            .sort((left, right) => left.sortOrder - right.sortOrder);
          if (selectedDocuments.length === 0) return;
          button.disabled = true;
          button.textContent = "Creating PDF…";
          try {
            const files = await Promise.all(
              selectedDocuments.map(({ id }) => getDocumentFile(id, key)),
            );
            const bytes = await createDocumentPack(files);
            const profileName =
              familyMembers.find(({ id }) => id === selectedProfileId)
                ?.fullName ?? "UrbanFox";
            downloadDocumentPack(bytes, profileName);
            button.textContent = "PDF pack downloaded";
          } catch {
            button.disabled = false;
            button.textContent = "⇩ Download PDF pack";
            showDocumentPageError(
              "The PDF pack could not be created. Check that every stored file can be opened.",
            );
          }
        });
      root
        .querySelector<HTMLButtonElement>("#add-document")
        ?.addEventListener("click", () => showDocumentUploadForm(root));
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-add-vault-section]",
      )) {
        button.addEventListener("click", () => {
          const sectionId = button.dataset.addVaultSection;
          if (sectionId === "address-history") {
            showAddressHistoryForm(root);
            return;
          }
          if (sectionId === "life-english") {
            showLifeEnglishForm(root, lifeEnglish);
            return;
          }
          const category = sectionId
            ? getDefaultCategoryForSection(sectionId)
            : null;
          showDocumentUploadForm(root, category ?? undefined);
        });
      }
      lifeEnglishDialog
        ?.querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => lifeEnglishDialog.close());
      lifeEnglishDialog?.addEventListener("click", (event) => {
        if (event.target === lifeEnglishDialog) lifeEnglishDialog.close();
      });
      lifeEnglishForm
        ?.querySelector<HTMLSelectElement>("#life-status")
        ?.addEventListener("change", () =>
          syncLifeEnglishForm(lifeEnglishForm),
        );
      lifeEnglishForm
        ?.querySelector<HTMLSelectElement>("#english-status")
        ?.addEventListener("change", () =>
          syncLifeEnglishForm(lifeEnglishForm),
        );
      lifeEnglishForm
        ?.querySelector<HTMLButtonElement>("[data-add-life-evidence]")
        ?.addEventListener("click", () => {
          lifeEnglishDialog.close();
          showDocumentUploadForm(root, "life-in-uk");
        });
      lifeEnglishForm
        ?.querySelector<HTMLButtonElement>("[data-add-english-evidence]")
        ?.addEventListener("click", () => {
          lifeEnglishDialog.close();
          showDocumentUploadForm(root, "english-language");
        });
      lifeEnglishForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const input = readLifeEnglishForm(lifeEnglishForm);
        const error = lifeEnglishForm.querySelector<HTMLElement>(
          "#life-english-error",
        );
        const validationError = validateLifeEnglishInput(input);
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const timestamp = new Date().toISOString();
        const nextRecord: LifeEnglishRecord = {
          version: 1,
          profileId: selectedProfileId,
          ...input,
          createdAt: lifeEnglish?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const submit = lifeEnglishForm.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveLifeEnglishRecord(selectedProfileId, nextRecord, key);
          lifeEnglishCache.set(selectedProfileId, nextRecord);
          lifeEnglishDialog.close();
          await showDocuments(profile);
        } catch {
          if (error) {
            error.textContent =
              "The encrypted Life in the UK and English details could not be saved.";
            error.hidden = false;
          }
          if (submit) submit.disabled = false;
        }
      });
      addressDialog
        ?.querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => addressDialog.close());
      addressDialog?.addEventListener("click", (event) => {
        if (event.target === addressDialog) addressDialog.close();
      });
      addressForm
        ?.querySelector<HTMLInputElement>("#address-current")
        ?.addEventListener("change", () => syncAddressEndState(addressForm));
      root
        .querySelector<HTMLButtonElement>("#address-history-reset")
        ?.addEventListener("click", () => {
          if (addressForm) resetAddressHistoryForm(addressForm);
        });
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-edit-address]",
      )) {
        button.addEventListener("click", () => {
          const entry = addressHistory.find(
            ({ id }) => id === button.dataset.editAddress,
          );
          if (entry) showAddressHistoryForm(root, entry);
        });
      }
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-add-address-proof]",
      )) {
        button.addEventListener("click", () => {
          const addressId = button.dataset.addAddressProof;
          if (!addressId) return;
          addressDialog?.close();
          showDocumentUploadForm(root, "address-proof", addressId);
        });
      }
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-delete-address]",
      )) {
        button.addEventListener("click", async () => {
          const addressId = button.dataset.deleteAddress;
          const entry = addressHistory.find(({ id }) => id === addressId);
          if (
            !entry ||
            !window.confirm(
              `Delete this address from the recorded timeline? Linked proof documents will remain in the vault.`,
            )
          )
            return;
          const nextEntries = addressHistory.filter(
            ({ id }) => id !== entry.id,
          );
          try {
            await saveAddressHistory(selectedProfileId, nextEntries, key);
            addressHistoryCache.set(selectedProfileId, nextEntries);
            await showDocuments(profile);
          } catch {
            const error = root.querySelector<HTMLElement>(
              "#address-history-error",
            );
            if (error) {
              error.textContent =
                "The address could not be deleted. Your saved timeline is unchanged.";
              error.hidden = false;
            }
          }
        });
      }
      addressForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { addressId, input } = readAddressHistoryForm(addressForm);
        const error = addressForm.querySelector<HTMLElement>(
          "#address-history-error",
        );
        const validationError = validateAddressHistoryInput(input);
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const existing = addressHistory.find(({ id }) => id === addressId);
        const timestamp = new Date().toISOString();
        const entry: AddressHistoryEntry = {
          version: 1,
          id: existing?.id ?? crypto.randomUUID(),
          profileId: selectedProfileId,
          ...input,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const nextEntries = existing
          ? addressHistory.map((current) =>
              current.id === existing.id ? entry : current,
            )
          : [...addressHistory, entry];
        const collectionError = validateAddressHistoryCollection(nextEntries);
        if (collectionError) {
          if (error) {
            error.textContent = collectionError;
            error.hidden = false;
          }
          return;
        }
        const submit = addressForm.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveAddressHistory(selectedProfileId, nextEntries, key);
          addressHistoryCache.set(selectedProfileId, nextEntries);
          addressDialog?.close();
          await showDocuments(profile);
        } catch {
          if (error) {
            error.textContent =
              "The encrypted address history could not be saved.";
            error.hidden = false;
          }
          if (submit) submit.disabled = false;
        }
      });
      uploadDialog
        ?.querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => uploadDialog.close());
      renameDialog
        ?.querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => renameDialog.close());
      uploadDialog?.addEventListener("click", (event) => {
        if (event.target === uploadDialog) uploadDialog.close();
      });
      renameDialog?.addEventListener("click", (event) => {
        if (event.target === renameDialog) renameDialog.close();
      });
      uploadForm
        ?.querySelector<HTMLInputElement>("#document-file")
        ?.addEventListener("change", (event) => {
          const file = (event.currentTarget as HTMLInputElement).files?.[0];
          const name = uploadForm.elements.namedItem(
            "displayName",
          ) as HTMLInputElement;
          if (file && !name.value.trim())
            name.value = suggestDocumentName(file.name);
        });
      uploadForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const error = uploadForm.querySelector<HTMLElement>(
          "#document-form-error",
        );
        const { displayName, category, addressHistoryId, file } =
          readDocumentUploadForm(uploadForm);
        const mimeType = file
          ? resolveDocumentMimeType(file.name, file.type)
          : null;
        const validationError = file
          ? validateDocumentUploadInput({
              displayName,
              category,
              fileName: file.name,
              mimeType: mimeType ?? file.type,
              size: file.size,
            })
          : "Choose a PDF, JPG, or PNG file.";
        if (validationError || !file || !mimeType) {
          if (error) {
            error.textContent =
              validationError ?? "Choose a PDF, JPG, or PNG file.";
            error.hidden = false;
          }
          return;
        }
        const profileDocuments = documents.filter(
          ({ profileId }) => profileId === selectedProfileId,
        );
        const totalBytes = documents.reduce(
          (total, document) => total + document.size,
          0,
        );
        if (profileDocuments.length >= MAXIMUM_DOCUMENTS_PER_PROFILE) {
          if (error) {
            error.textContent =
              "This profile already has the maximum of 25 documents.";
            error.hidden = false;
          }
          return;
        }
        if (totalBytes + file.size > MAXIMUM_TOTAL_DOCUMENT_BYTES) {
          if (error) {
            error.textContent =
              "Document storage would exceed the 50 MB app limit.";
            error.hidden = false;
          }
          return;
        }
        if (navigator.storage?.estimate) {
          const estimate = await navigator.storage.estimate();
          if (
            estimate.quota &&
            (estimate.usage ?? 0) + file.size + 1024 > estimate.quota * 0.95
          ) {
            if (error) {
              error.textContent =
                "This browser does not have enough local storage for that document.";
              error.hidden = false;
            }
            return;
          }
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const signatureError = validateDocumentSignature(mimeType, bytes);
        if (signatureError) {
          if (error) {
            error.textContent = signatureError;
            error.hidden = false;
          }
          return;
        }
        const timestamp = new Date().toISOString();
        const metadata: DocumentMetadata = {
          version: 1,
          id: crypto.randomUUID(),
          profileId: selectedProfileId,
          displayName,
          fileName: file.name.trim(),
          mimeType,
          size: file.size,
          category,
          ...(addressHistoryId ? { addressHistoryId } : {}),
          sortOrder:
            profileDocuments.reduce(
              (maximum, document) => Math.max(maximum, document.sortOrder),
              -1,
            ) + 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const submit = uploadForm.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveDocument(metadata, bytes, key);
          uploadDialog?.close();
          await showDocuments(profile);
        } catch {
          if (error) {
            error.textContent =
              "The document could not be encrypted and saved. No partial file was stored.";
            error.hidden = false;
          }
          if (submit) submit.disabled = false;
        }
      });
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-open-document]",
      ))
        button.addEventListener("click", () => {
          const documentId = button.dataset.documentId;
          if (documentId) void downloadDecryptedDocument(documentId, true);
        });
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-download-document]",
      ))
        button.addEventListener("click", () => {
          const documentId = button.dataset.documentId;
          if (documentId) void downloadDecryptedDocument(documentId, false);
        });
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-rename-document]",
      ))
        button.addEventListener("click", () => {
          const document = documents.find(
            ({ id }) => id === button.dataset.documentId,
          );
          if (document) showDocumentRenameForm(root, document);
        });
      renameForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { documentId, displayName } = readDocumentRenameForm(renameForm);
        const error = renameForm.querySelector<HTMLElement>(
          "#document-rename-error",
        );
        const validationError = validateDocumentName(displayName);
        const current = documents.find(({ id }) => id === documentId);
        if (validationError || !current) {
          if (error) {
            error.textContent = validationError ?? "Document is unavailable.";
            error.hidden = false;
          }
          return;
        }
        try {
          await saveDocumentMetadataBatch(
            [{ ...current, displayName, updatedAt: new Date().toISOString() }],
            key,
          );
          renameDialog?.close();
          await showDocuments(profile);
        } catch {
          if (error) {
            error.textContent = "The document name could not be updated.";
            error.hidden = false;
          }
        }
      });
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-move-document]",
      ))
        button.addEventListener("click", async () => {
          const ordered = documents
            .filter(({ profileId }) => profileId === selectedProfileId)
            .sort((left, right) => left.sortOrder - right.sortOrder);
          const index = ordered.findIndex(
            ({ id }) => id === button.dataset.documentId,
          );
          const targetIndex =
            button.dataset.moveDocument === "up" ? index - 1 : index + 1;
          if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length)
            return;
          const currentDocument = ordered[index];
          const targetDocument = ordered[targetIndex];
          if (!currentDocument || !targetDocument) return;
          ordered[index] = targetDocument;
          ordered[targetIndex] = currentDocument;
          const timestamp = new Date().toISOString();
          try {
            await saveDocumentMetadataBatch(
              ordered.map((document, sortOrder) => ({
                ...document,
                sortOrder,
                updatedAt: timestamp,
              })),
              key,
            );
            await showDocuments(profile);
          } catch {
            showDocumentPageError(
              "The document order could not be changed. Your files are unchanged.",
            );
          }
        });
      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-delete-document]",
      ))
        button.addEventListener("click", async () => {
          const document = documents.find(
            ({ id }) => id === button.dataset.documentId,
          );
          if (
            !document ||
            !window.confirm(
              `Delete ${document.displayName} from encrypted local storage? This cannot be undone.`,
            )
          )
            return;
          try {
            await deleteDocument(document.id);
            await showDocuments(profile);
          } catch {
            showDocumentPageError(
              "The document could not be deleted. Your stored file is unchanged.",
            );
          }
        });
    };

    const showDocuments = async (profile: HouseholdMember): Promise<void> => {
      try {
        const cachedPermissions = permissionCache.get(selectedProfileId);
        const cachedAddressHistory = addressHistoryCache.get(selectedProfileId);
        const hasCachedLifeEnglish = lifeEnglishCache.has(selectedProfileId);
        const [documents, permissions, addressHistory, lifeEnglish] =
          await Promise.all([
            getAllDocumentMetadata(key),
            cachedPermissions ??
              getImmigrationPermissions(selectedProfileId, key),
            cachedAddressHistory ?? getAddressHistory(selectedProfileId, key),
            hasCachedLifeEnglish
              ? Promise.resolve(lifeEnglishCache.get(selectedProfileId) ?? null)
              : getLifeEnglishRecord(selectedProfileId, key),
          ]);
        permissionCache.set(selectedProfileId, permissions);
        addressHistoryCache.set(selectedProfileId, addressHistory);
        lifeEnglishCache.set(selectedProfileId, lifeEnglish);
        renderDocuments(
          profile,
          documents,
          addressHistory,
          getRequiredAddressHistoryMonths(permissions),
          lifeEnglish,
        );
      } catch {
        renderDocuments(profile, [], [], null, null);
        const add = root.querySelector<HTMLButtonElement>("#add-document");
        if (add) add.disabled = true;
        showDocumentPageError(
          "Encrypted Document Vault data could not be opened on this device.",
        );
      }
    };

    const wireDashboardActions = (profile: HouseholdMember): void => {
      const dialog = root.querySelector<HTMLDialogElement>("#family-dialog");
      const form = root.querySelector<HTMLFormElement>("#family-form");
      const addMember = root.querySelector<HTMLButtonElement>("#manage-family");
      if (addMember) addMember.disabled = !familyProfilesAvailable;

      root
        .querySelector<HTMLButtonElement>("#manage-permissions")
        ?.addEventListener("click", () => void showPermissions(profile));
      root
        .querySelector<HTMLButtonElement>("#manage-trips")
        ?.addEventListener("click", () => void showTrips(profile));
      addMember?.addEventListener("click", () => showHouseholdMemberForm(root));
      root
        .querySelector<HTMLButtonElement>(".dialog-close")
        ?.addEventListener("click", () => dialog?.close());
      dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-select-dashboard-profile]",
      )) {
        button.addEventListener("click", () => {
          const profileId = button.dataset.selectDashboardProfile;
          if (!profileId || !isKnownProfileId(profileId, familyMembers)) return;
          selectedProfileId = profileId;
          const selectedMember = familyMembers.find(
            ({ id }) => id === profileId,
          );
          if (selectedMember) renderDashboard(selectedMember);
        });
      }

      for (const button of root.querySelectorAll<HTMLButtonElement>(
        "[data-edit-dashboard-member]",
      )) {
        button.addEventListener("click", () => {
          const profileId = button.dataset.editDashboardMember;
          const member = familyMembers.find(({ id }) => id === profileId);
          if (!profileId || !member) return;
          selectedProfileId = profileId;
          showHouseholdMemberForm(root, member, familyMembers.length > 1);
        });
      }

      root
        .querySelector<HTMLButtonElement>("#delete-household-member")
        ?.addEventListener("click", async (event) => {
          const button = event.currentTarget as HTMLButtonElement;
          const member = familyMembers.find(
            ({ id }) => id === button.dataset.memberId,
          );
          if (
            !member ||
            !window.confirm(
              `Delete ${member.fullName} from this local household? This cannot be undone.`,
            )
          )
            return;
          const nextMembers = familyMembers.filter(
            ({ id }) => id !== member.id,
          );
          try {
            await saveHouseholdMembers(nextMembers, key);
            familyMembers = nextMembers;
            if (selectedProfileId === member.id)
              selectedProfileId = nextMembers[0]?.id ?? "";
            dialog?.close();
            const selectedMember =
              nextMembers.find(({ id }) => id === selectedProfileId) ??
              nextMembers[0];
            if (selectedMember) renderDashboard(selectedMember);
          } catch {
            const error =
              form?.querySelector<HTMLElement>("#family-form-error");
            if (error) {
              error.textContent =
                "The family member could not be deleted. Your existing data is unchanged.";
              error.hidden = false;
            }
          }
        });

      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const { memberId, input } = readHouseholdMemberInput(form);
        const validationError = validateHouseholdMemberInput(input);
        const error = form.querySelector<HTMLElement>("#family-form-error");
        if (validationError) {
          if (error) {
            error.textContent = validationError;
            error.hidden = false;
          }
          return;
        }
        const existingMember = familyMembers.find(({ id }) => id === memberId);
        const timestamp = new Date().toISOString();
        const member: HouseholdMember = {
          version: 1,
          id: existingMember?.id ?? crypto.randomUUID(),
          ...input,
          createdAt: existingMember?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const nextMembers = existingMember
          ? familyMembers.map((current) =>
              current.id === existingMember.id ? member : current,
            )
          : [...familyMembers, member];
        const submit = form.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        if (submit) submit.disabled = true;
        try {
          await saveHouseholdMembers(nextMembers, key);
          familyMembers = nextMembers;
          familyProfilesAvailable = true;
          if (!existingMember) selectedProfileId = member.id;
          dialog?.close();
          const selectedMember =
            nextMembers.find(({ id }) => id === selectedProfileId) ??
            nextMembers[0];
          if (selectedMember) renderDashboard(selectedMember);
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

    const renderPermissions = (
      profile: HouseholdMember,
      permissions: ImmigrationPermission[],
    ): void => {
      renderImmigrationHistoryPage(
        root,
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

    const showPermissions = async (profile: HouseholdMember): Promise<void> => {
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

    const buildTravelOverview = (
      trips: Trip[],
      permissions: ImmigrationPermission[],
    ): TravelOverview => {
      const asOfDate = getUkCalendarDate();
      const latestPermission = [...permissions].sort((left, right) =>
        right.permissionStartDate.localeCompare(left.permissionStartDate),
      )[0];
      const isDependant = latestPermission?.role === "dependant";
      const input = { permissions, trips, asOfDate };
      const absence = isDependant
        ? calculateRecordedDependantAbsenceCheck(input)
        : calculateRecordedAbsenceCheck(input);
      const period = isDependant
        ? calculateSkilledWorkerDependantQualifyingPeriod(permissions, asOfDate)
        : calculateSkilledWorkerQualifyingPeriod({ permissions, asOfDate });
      return {
        maximumRecordedDays: permissions.length
          ? absence.maximumRecordedDays
          : null,
        absenceStatus: permissions.length ? absence.status : null,
        earliestApplicationDate: period.earliestApplicationDate,
        asOfDate,
      };
    };

    const renderTrips = (profile: HouseholdMember, trips: Trip[]): void => {
      const permissions = permissionCache.get(selectedProfileId) ?? [];
      renderTripsPage(
        root,
        familyMembers,
        selectedProfileId,
        trips,
        buildTravelOverview(trips, permissions),
      );
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

    const showTrips = async (profile: HouseholdMember): Promise<void> => {
      try {
        const cachedTrips = tripCache.get(selectedProfileId);
        const cachedPermissions = permissionCache.get(selectedProfileId);
        const [trips, permissions] = await Promise.all([
          cachedTrips ?? getTrips(selectedProfileId, key),
          cachedPermissions ??
            getImmigrationPermissions(selectedProfileId, key),
        ]);
        tripCache.set(selectedProfileId, trips);
        permissionCache.set(selectedProfileId, permissions);
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
      profile: HouseholdMember,
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
        const latestPermission = [...permissions].sort((left, right) =>
          right.permissionStartDate.localeCompare(left.permissionStartDate),
        )[0];
        const isDependant = latestPermission?.role === "dependant";
        const calculationInput = {
          permissions,
          trips,
          asOfDate: getUkCalendarDate(),
        };
        const result = isDependant
          ? calculateRecordedDependantAbsenceCheck(calculationInput)
          : calculateRecordedAbsenceCheck(calculationInput);
        const period = isDependant
          ? calculateSkilledWorkerDependantQualifyingPeriod(
              permissions,
              getUkCalendarDate(),
            )
          : calculateSkilledWorkerQualifyingPeriod({
              permissions,
              asOfDate: getUkCalendarDate(),
            });
        renderAbsenceSummary(root, result, period);
        const householdStatus = root.querySelector<HTMLElement>(
          "#household-status-value",
        );
        const householdStatusCopy = root.querySelector<HTMLElement>(
          "#household-status-copy",
        );
        const householdAbsence = root.querySelector<HTMLElement>(
          "#household-total-absence",
        );
        if (householdAbsence)
          householdAbsence.textContent = String(result.maximumRecordedDays);
        if (householdStatus && householdStatusCopy) {
          if (result.status === "within-recorded-limit") {
            householdStatus.textContent = "On Track";
            householdStatusCopy.textContent = "Recorded Absences Within Limit";
          } else if (result.status === "potentially-over-limit") {
            householdStatus.textContent = "Review";
            householdStatusCopy.textContent = "Potential Absence Limit Issue";
          } else if (result.status === "manual-review") {
            householdStatus.textContent = "Review";
            householdStatusCopy.textContent = "Manual Review Needed";
          } else {
            householdStatus.textContent = "Setup";
            householdStatusCopy.textContent = "More Information Needed";
          }
        }
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
      try {
        familyMembers = await getHouseholdMembers(key);
      } catch {
        familyMembers = [];
        familyProfilesAvailable = false;
      }

      const firstMember = familyMembers[0];
      if (firstMember) {
        if (!isKnownProfileId(selectedProfileId, familyMembers))
          selectedProfileId = firstMember.id;
        renderDashboard(firstMember);
        return;
      }

      const form = renderFirstMemberForm(root);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const input = {
          fullName: String(data.get("fullName") ?? "").trim(),
          dateOfBirth: String(data.get("dateOfBirth") ?? ""),
          immigrationRole: String(
            data.get("immigrationRole") ?? "",
          ) as HouseholdMember["immigrationRole"],
        };
        const error = validateHouseholdMemberInput(input);
        const errorElement = form.querySelector<HTMLElement>("#member-error");
        if (error) {
          if (errorElement) {
            errorElement.textContent = error;
            errorElement.hidden = false;
          }
          return;
        }
        const timestamp = new Date().toISOString();
        const member: HouseholdMember = {
          version: 1,
          id: crypto.randomUUID(),
          ...input,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        try {
          await saveHouseholdMembers([member], key);
          familyMembers = [member];
          familyProfilesAvailable = true;
          selectedProfileId = member.id;
          renderDashboard(member);
        } catch {
          if (errorElement) {
            errorElement.textContent =
              "This encrypted household member could not be saved.";
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
          selectedProfileId = "";
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
