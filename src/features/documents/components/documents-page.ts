import { renderAppShell } from "../../../app/app";
import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "../../household/components/person-switcher";
import type { HouseholdMember } from "../../household/domain/household-member";
import {
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentBytes,
  MAXIMUM_DOCUMENT_BYTES,
  MAXIMUM_TOTAL_DOCUMENT_BYTES,
  type DocumentCategory,
  type DocumentMetadata,
} from "../domain/document";
import {
  calculateDocumentVaultProgress,
  DOCUMENT_VAULT_STATUS_LABELS,
  type DocumentVaultSectionProgress,
} from "../domain/document-vault";
import type {
  AddressHistoryCoverage,
  AddressHistoryEntry,
} from "../domain/address-history";
import {
  renderAddressHistoryDialog,
  renderReadOnlyAddressList,
} from "./address-history-dialog";
import { renderLifeEnglishDialogs } from "./life-english-dialog";
import {
  isEnglishRequirementComplete,
  isLifeInUkComplete,
  type LifeEnglishRecord,
} from "../domain/life-english";

export function renderDocumentsPage(
  root: HTMLElement,
  members: HouseholdMember[],
  selectedProfileId: string,
  allDocuments: DocumentMetadata[],
  addressHistory: readonly AddressHistoryEntry[],
  addressCoverage: AddressHistoryCoverage,
  requiredAddressStartMonth: string | null,
  addressMonthsRemaining: number | null,
  lifeEnglish: LifeEnglishRecord | null,
): void {
  const documents = allDocuments
    .filter(({ profileId }) => profileId === selectedProfileId)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt.localeCompare(right.createdAt),
    );
  const totalBytes = allDocuments.reduce(
    (total, document) => total + document.size,
    0,
  );
  const storagePercent = Math.min(
    100,
    (totalBytes / MAXIMUM_TOTAL_DOCUMENT_BYTES) * 100,
  );
  const vaultProgress = calculateDocumentVaultProgress(documents, {
    addressHistoryComplete: addressCoverage.complete,
    addressHistoryEntryCount: addressHistory.length,
    addressHistoryHasCurrentAddress:
      addressHistory.length === 0 ||
      addressHistory.some(({ isCurrent }) => isCurrent),
    lifeInUkComplete: isLifeInUkComplete(lifeEnglish),
    englishRequirementComplete: isEnglishRequirementComplete(lifeEnglish),
  });
  renderAppShell(
    root,
    "Documents",
    `<main id="main-content" class="record-main documents-main document-vault-main">
      <section class="record-heading documents-heading vault-heading" aria-labelledby="documents-title"><div class="vault-heading-copy"><span class="vault-heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 6.5h6l2 2h9v10.5h-17Z"/><path d="M7.5 12h9M7.5 15.5h6"/></svg></span><div><p class="eyebrow">Encrypted on this device</p><h1 id="documents-title">Document Vault</h1><p>Keep every applicant’s ILR evidence organised in one private place.</p></div></div></section>
      <section class="documents-profile-picker vault-profile-picker" aria-label="Choose a profile for documents">${renderVaultMemberStrip(members, selectedProfileId)}<div class="documents-profile-select">${renderPersonSwitcherMarkup()}</div></section>
      <section class="document-summary-grid vault-summary-grid" aria-label="Local document summary"><article class="document-summary-card vault-readiness-card"><p class="eyebrow">Selected profile</p><div class="vault-readiness-line"><p class="document-summary-value"><span id="vault-readiness-percent">${vaultProgress.readinessPercent}%</span><small>ready</small></p><span class="vault-ready-label">${vaultProgress.completedRequired} of ${vaultProgress.totalRequired} core items</span></div><div class="vault-readiness-track" role="progressbar" aria-label="Document Vault readiness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${vaultProgress.readinessPercent}"><span style="--vault-readiness-progress: ${vaultProgress.readinessPercent}%"></span></div><p>${vaultProgress.completedSections} of ${vaultProgress.sections.length} sections complete. Conditional and later items do not reduce readiness.</p></article><article class="document-summary-card vault-storage-card"><p class="eyebrow">Encrypted storage</p><p class="document-summary-date">${formatDocumentBytes(totalBytes)} <small>of 50 MB</small></p><div class="document-storage-track" role="progressbar" aria-label="Document storage used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(storagePercent)}"><span style="--document-storage-progress: ${storagePercent}%"></span></div><p>Across every household profile on this device</p></article></section>
      <section class="vault-category-list" aria-label="Document Vault categories">${renderVaultCategoryRows(vaultProgress.sections, addressHistory, documents)}</section>
<section class="vault-download-panel"><button id="download-document-bundle" class="vault-download-button" type="button" ${documents.length === 0 && addressHistory.length === 0 ? "disabled" : ""}><span aria-hidden="true">⇩</span> Download doc bundle</button></section>
<aside class="notice compact-notice documents-backup-notice" aria-labelledby="documents-backup-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="documents-backup-title">Backups include documents</h2><p>Encrypted backups include document files. Keep originals and the separate backup password safe because UrbanFox cannot recover them.</p></div></aside>
      <section class="documents-panel" aria-labelledby="document-list-title"><div class="section-heading"><div><p class="eyebrow">Selected profile</p><h2 id="document-list-title">Document collection</h2></div></div><div id="document-list" class="document-list"></div></section>
      <p id="document-page-error" class="form-error" role="alert" hidden></p>
    </main>
    ${renderLiquidGlassDialog({
      id: "document-dialog",
      labelledBy: "document-form-title",
      formId: "document-form",
      eyebrow: "Encrypted local upload",
      title: "Add document",
      subtitle: "PDF, JPG, or PNG · Maximum 5 MB",
      iconSvg:
        '<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h4M10 12h6M10 16h6"/></svg>',
      body: `<input name="documentId" type="hidden" /><div class="family-form-fields"><div class="family-field family-field-wide"><label for="document-file" data-document-file-label>Document file</label><input name="addressHistoryId" type="hidden" /><input id="document-file" name="documentFile" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /><p class="field-guidance" data-document-file-guidance>The file is encrypted before it is stored in this browser.</p></div><div class="family-field family-field-wide"><label for="document-name">Document name</label><input id="document-name" name="displayName" maxlength="100" required /></div><div class="family-field family-field-wide"><label for="document-category">Category</label><select id="document-category" name="category" required><option value="">Choose category</option><optgroup label="Identity & Immigration"><option value="passport">Passport</option><option value="immigration-evidence">Immigration evidence</option></optgroup><optgroup label="Address History"><option value="address-proof">Address proof</option></optgroup><optgroup label="Employment"><option value="employer-letter">Employer letter</option><option value="employment-contract">Employment contract</option></optgroup><optgroup label="Salary & Tax"><option value="payslip">Payslip</option><option value="tax-document">Tax document</option></optgroup><optgroup label="Travel & Absences"><option value="travel-evidence">Travel evidence</option></optgroup><optgroup label="Life in the UK & English"><option value="life-in-uk">Life in the UK evidence</option><option value="english-language">English-language evidence</option></optgroup><optgroup label="Family / Dependants"><option value="relationship-evidence">Relationship evidence</option></optgroup><optgroup label="Final Application Documents"><option value="application-form">Application form</option><option value="declaration-consent">Declaration or consent</option></optgroup><optgroup label="Additional Documents"><option value="additional-document">Additional supporting document</option></optgroup></select></div></div><p id="document-form-error" class="form-error" role="alert" hidden></p>`,
      actions:
        '<button class="secondary-button" type="button" data-document-cancel>Cancel</button><button class="primary-button family-save-button liquid-dialog-save" type="submit" data-document-submit>Encrypt and save document</button>',
      dialogClass: "document-dialog",
      formClass: "document-evidence-form",
      closeLabel: "Close document form",
    })}
    ${renderAddressHistoryDialog(
      addressHistory,
      addressCoverage,
      requiredAddressStartMonth,
      addressMonthsRemaining,
      documents,
    )}
    ${renderLifeEnglishDialogs(documents)}
    ${renderLiquidGlassDialog({
      id: "document-rename-dialog",
      labelledBy: "document-rename-title",
      formId: "document-rename-form",
      eyebrow: "Encrypted metadata",
      title: "Rename document",
      iconSvg:
        '<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7Z"/><path d="m10 16 6-6 2 2-6 6-3 1Z"/></svg>',
      body: `<input name="documentId" type="hidden" /><div class="family-field"><label for="document-new-name">Document name</label><input id="document-new-name" name="displayName" maxlength="100" required /></div><p id="document-rename-error" class="form-error" role="alert" hidden></p>`,
      actions:
        '<button class="primary-button liquid-dialog-save" type="submit">Save document name</button>',
      dialogClass: "document-rename-dialog",
      closeLabel: "Close rename form",
    })}`,
  );
  populatePersonSwitcher(root, members, selectedProfileId);
  wireVaultMemberStrip(root);
  const list = root.querySelector<HTMLElement>("#document-list");
  if (!list) throw new Error("Documents could not be rendered.");
  if (documents.length === 0) {
    const empty = document.createElement("div");
    empty.className = "family-empty-state document-empty-state";
    empty.innerHTML =
      "<h3>No documents added yet</h3><p>Add only files you want encrypted and stored locally for this person.</p>";
    list.append(empty);
    return;
  }
  documents.forEach((document, index) =>
    list.append(
      createDocumentCard(document, index === 0, index === documents.length - 1),
    ),
  );
}

function renderVaultCategoryRows(
  sections: readonly DocumentVaultSectionProgress[],
  addressHistory: readonly AddressHistoryEntry[],
  documents: readonly DocumentMetadata[],
): string {
  return sections
    .map((section) => {
      const statusLabel = DOCUMENT_VAULT_STATUS_LABELS[section.status];
      const missingCurrentAddress =
        section.id === "address-history" &&
        addressHistory.length > 0 &&
        !addressHistory.some(({ isCurrent }) => isCurrent);
      const addressList =
        section.id === "address-history"
          ? renderReadOnlyAddressList(addressHistory)
          : "";
      const statusMessage = section.statusMessage
        ? `<p class="vault-section-status-message">${section.statusMessage}</p>`
        : "";
      let sectionAction = "";
      if (section.id === "address-history") {
        const addressActionLabel = missingCurrentAddress
          ? "Add current address"
          : addressHistory.length > 0
            ? "Edit address"
            : "Add address";
        sectionAction = `<button class="vault-section-add${missingCurrentAddress ? " is-attention-action" : ""}" type="button" data-add-vault-section="${section.id}">${addressActionLabel}</button>`;
      }
      return `<details class="vault-section-card status-${section.status}" data-vault-section="${section.id}"><summary class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">${section.icon}</span><div><h2>${section.label}</h2><p class="vault-category-description">${section.description}</p>${statusMessage}</div><span class="vault-category-status">${statusLabel}</span><span class="vault-category-state" aria-hidden="true">${renderVaultStatusIcon(section.status)}</span></summary><div class="vault-requirement-panel"><div class="vault-requirement-heading"><div><strong>Checklist</strong><span>${section.completedItems} of ${section.totalItems} added</span></div>${sectionAction}</div><ul class="vault-requirement-list">${section.requirements.map((requirement) => renderVaultRequirement(requirement, section.id, documents)).join("")}</ul>${addressList}</div></details>`;
    })
    .join("");
}

function renderVaultRequirement(
  requirement: DocumentVaultSectionProgress["requirements"][number],
  sectionId: string,
  documents: readonly DocumentMetadata[],
): string {
  const priority =
    requirement.priority === "required"
      ? "Core"
      : requirement.priority === "later"
        ? "Later"
        : requirement.priority === "conditional"
          ? "If applicable"
          : "Recommended";
  const completionLabel =
    requirement.id === "address-proof"
      ? "Timeline and evidence complete"
      : `${requirement.documentCount} added`;
  const incompleteLabel =
    requirement.id === "address-proof" ? "Upload evidence" : priority;
  const existingDocument = documents.find((document) =>
    requirement.categories.includes(document.category),
  );
  const hasExistingEvidence =
    sectionId === "life-english" ? requirement.complete : !!existingDocument;
  const actionLabel = `${hasExistingEvidence ? "Edit" : "Add"} ${requirement.label}`;
  const content = `<span class="vault-requirement-state" aria-hidden="true">${requirement.complete ? "✓" : "○"}</span><div><strong>${sectionId === "address-history" ? requirement.label : actionLabel}</strong><span>${requirement.guidance}</span></div><small>${requirement.complete ? completionLabel : incompleteLabel}</small>`;
  if (sectionId !== "address-history") {
    const category = requirement.categories[0];
    if (sectionId === "life-english")
      return `<li class="vault-requirement-item vault-requirement-action${requirement.complete ? " is-complete" : ""}"><button type="button" data-life-english-form="${category}" aria-label="${actionLabel}">${content}</button></li>`;
    return `<li class="vault-requirement-item vault-requirement-action${requirement.complete ? " is-complete" : ""}"><button type="button" data-document-evidence="${category}"${existingDocument ? ` data-document-id="${existingDocument.id}"` : ""} aria-label="${actionLabel}">${content}</button></li>`;
  }
  return `<li class="vault-requirement-item${requirement.complete ? " is-complete" : ""}">${content}</li>`;
}

function renderVaultStatusIcon(
  status: DocumentVaultSectionProgress["status"],
): string {
  if (status === "complete") return "✓";
  if (status === "needs-attention") return "!";
  if (status === "partial") return "◐";
  if (status === "required-later") return "↗";
  return "○";
}
function renderVaultMemberStrip(
  members: HouseholdMember[],
  selectedProfileId: string,
): string {
  return `<div class="vault-profile-rail" role="list">${members
    .map((member) => {
      const selected = member.id === selectedProfileId;
      const initial = member.fullName.trim().charAt(0).toUpperCase() || "?";
      const firstName =
        member.fullName.trim().split(/\s+/)[0] || member.fullName;
      return `<button class="vault-profile-chip${selected ? " is-selected" : ""}" type="button" data-vault-profile="${member.id}" ${selected ? 'aria-current="true"' : ""}><span class="vault-profile-avatar" aria-hidden="true">${initial}</span><span>${escapeVaultLabel(firstName)}</span></button>`;
    })
    .join("")}</div>`;
}

function wireVaultMemberStrip(root: HTMLElement): void {
  const select = root.querySelector<HTMLSelectElement>("#active-person");
  if (!select) return;
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-vault-profile]",
  )) {
    button.addEventListener("click", () => {
      const profileId = button.dataset.vaultProfile;
      if (!profileId || profileId === select.value) return;
      select.value = profileId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
}

function escapeVaultLabel(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function createDocumentCard(
  document: DocumentMetadata,
  isFirst: boolean,
  isLast: boolean,
): HTMLElement {
  const card = documentNode("article", "document-card");
  card.innerHTML = `<div class="document-card-main"><span class="document-type-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h4M10 12h6M10 16h6"/></svg></span><div class="document-copy"><h3></h3><p class="document-original-name"></p><div class="document-badges"><span class="document-category"></span><span class="document-size"></span><span class="document-review-badge" hidden>Needs attention · no address linked</span></div></div></div><div class="document-actions"><button class="member-action" type="button" data-open-document>Open</button><button class="member-action" type="button" data-download-document>Download</button><button class="member-action" type="button" data-rename-document>Rename</button><button class="member-action document-order-action" type="button" data-move-document="up" aria-label="Move document up">↑</button><button class="member-action document-order-action" type="button" data-move-document="down" aria-label="Move document down">↓</button><button class="member-action destructive-action" type="button" data-delete-document>Delete</button></div>`;
  const heading = card.querySelector<HTMLElement>("h3");
  const originalName = card.querySelector<HTMLElement>(
    ".document-original-name",
  );
  const category = card.querySelector<HTMLElement>(".document-category");
  const size = card.querySelector<HTMLElement>(".document-size");
  const review = card.querySelector<HTMLElement>(".document-review-badge");
  if (heading) heading.textContent = document.displayName;
  if (originalName) originalName.textContent = document.fileName;
  if (category)
    category.textContent = DOCUMENT_CATEGORY_LABELS[document.category];
  if (size) size.textContent = formatDocumentBytes(document.size);
  if (review)
    review.hidden = !(
      document.category === "address-proof" && !document.addressHistoryId
    );
  for (const button of card.querySelectorAll<HTMLButtonElement>("button")) {
    button.dataset.documentId = document.id;
    const action = button.textContent?.trim();
    if (action && action !== "↑" && action !== "↓")
      button.setAttribute("aria-label", `${action} ${document.displayName}`);
  }
  const moveUp = card.querySelector<HTMLButtonElement>(
    '[data-move-document="up"]',
  );
  const moveDown = card.querySelector<HTMLButtonElement>(
    '[data-move-document="down"]',
  );
  if (moveUp) {
    moveUp.disabled = isFirst;
    moveUp.setAttribute("aria-label", `Move ${document.displayName} up`);
  }
  if (moveDown) {
    moveDown.disabled = isLast;
    moveDown.setAttribute("aria-label", `Move ${document.displayName} down`);
  }
  return card;
}

function documentNode<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = window.document.createElement(tagName);
  element.className = className;
  return element;
}

export function showDocumentUploadForm(
  root: HTMLElement,
  category?: DocumentCategory,
  addressHistoryId?: string,
  existingDocument?: DocumentMetadata,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#document-dialog");
  const form = root.querySelector<HTMLFormElement>("#document-form");
  if (!dialog || !form) throw new Error("Document form is unavailable.");
  form.reset();
  const documentId = form.elements.namedItem("documentId") as HTMLInputElement;
  documentId.value = existingDocument?.id ?? "";
  const categorySelect = form.elements.namedItem(
    "category",
  ) as HTMLSelectElement | null;
  if (categorySelect)
    categorySelect.value = existingDocument?.category ?? category ?? "";
  const addressId = form.elements.namedItem(
    "addressHistoryId",
  ) as HTMLInputElement | null;
  if (addressId) addressId.value = addressHistoryId ?? "";
  const displayName = form.elements.namedItem(
    "displayName",
  ) as HTMLInputElement;
  displayName.value = existingDocument?.displayName ?? "";
  const fileInput = form.elements.namedItem("documentFile") as HTMLInputElement;
  fileInput.required = !existingDocument;
  const title = dialog.querySelector<HTMLElement>("#document-form-title");
  if (title)
    title.textContent = existingDocument
      ? `Edit ${DOCUMENT_CATEGORY_LABELS[existingDocument.category]}`
      : category
        ? `Add ${DOCUMENT_CATEGORY_LABELS[category]}`
        : "Add document";
  const fileLabel = dialog.querySelector<HTMLElement>(
    "[data-document-file-label]",
  );
  if (fileLabel)
    fileLabel.textContent = existingDocument
      ? "Replacement file (optional)"
      : "Document file";
  const fileGuidance = dialog.querySelector<HTMLElement>(
    "[data-document-file-guidance]",
  );
  if (fileGuidance)
    fileGuidance.textContent = existingDocument
      ? `Current file: ${existingDocument.fileName}. Choose a replacement only if needed.`
      : "The file is encrypted before it is stored in this browser.";
  const submit = dialog.querySelector<HTMLButtonElement>(
    "[data-document-submit]",
  );
  if (submit) {
    submit.disabled = false;
    submit.textContent = existingDocument
      ? "Save changes"
      : "Encrypt and save document";
  }
  const error = form.querySelector<HTMLElement>("#document-form-error");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  dialog.showModal();
}

export function suggestDocumentName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const suggestion = withoutExtension.replace(/[_-]+/g, " ").trim();
  return (suggestion || "Document").slice(0, 100);
}

export function readDocumentUploadForm(form: HTMLFormElement): {
  documentId?: string;
  displayName: string;
  category: DocumentCategory;
  addressHistoryId?: string;
  file: File | null;
} {
  const data = new FormData(form);
  const input = form.elements.namedItem("documentFile") as HTMLInputElement;
  return {
    documentId: String(data.get("documentId") ?? "") || undefined,
    displayName: String(data.get("displayName") ?? "").trim(),
    category: String(data.get("category") ?? "") as DocumentCategory,
    addressHistoryId: String(data.get("addressHistoryId") ?? "") || undefined,
    file: input.files?.[0] ?? null,
  };
}

export function showDocumentRenameForm(
  root: HTMLElement,
  document: DocumentMetadata,
): void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "#document-rename-dialog",
  );
  const form = root.querySelector<HTMLFormElement>("#document-rename-form");
  if (!dialog || !form) throw new Error("Document rename form is unavailable.");
  form.reset();
  (form.elements.namedItem("documentId") as HTMLInputElement).value =
    document.id;
  (form.elements.namedItem("displayName") as HTMLInputElement).value =
    document.displayName;
  const error = form.querySelector<HTMLElement>("#document-rename-error");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  dialog.showModal();
}

export function readDocumentRenameForm(form: HTMLFormElement): {
  documentId: string;
  displayName: string;
} {
  const data = new FormData(form);
  return {
    documentId: String(data.get("documentId") ?? ""),
    displayName: String(data.get("displayName") ?? "").trim(),
  };
}

export function getDocumentFileLimitLabel(): string {
  return formatDocumentBytes(MAXIMUM_DOCUMENT_BYTES);
}
