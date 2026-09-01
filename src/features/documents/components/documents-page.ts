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

export function renderDocumentsPage(
  root: HTMLElement,
  members: HouseholdMember[],
  selectedProfileId: string,
  allDocuments: DocumentMetadata[],
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
  renderAppShell(
    root,
    "Documents",
    `<main id="main-content" class="record-main documents-main">
      <section class="record-heading documents-heading vault-heading" aria-labelledby="documents-title"><div class="vault-heading-copy"><span class="vault-heading-icon" aria-hidden="true">▣</span><div><p class="eyebrow">Encrypted on this device</p><h1 id="documents-title">Document Vault</h1><p>Keep every applicant’s ILR evidence organised in one private place.</p></div></div><div class="record-heading-actions document-heading-actions"><button id="add-document" class="vault-add-button" type="button"><span aria-hidden="true">＋</span> Add document</button></div></section>
      <section class="documents-profile-picker" aria-label="Choose a profile for documents">${renderPersonSwitcherMarkup()}</section>
      <section class="document-summary-grid vault-summary-grid" aria-label="Local document summary"><article class="document-summary-card vault-readiness-card"><p class="eyebrow">Selected profile</p><div class="vault-readiness-line"><p class="document-summary-value"><span id="document-count">${documents.length}</span><small>${documents.length === 1 ? "document" : "documents"}</small></p><span class="vault-ready-label">${documents.length > 0 ? "In progress" : "To do"}</span></div><div class="vault-readiness-track" aria-hidden="true"><span style="--vault-readiness-progress: ${Math.min(100, documents.length * 12)}%"></span></div><p>Build this applicant’s evidence pack section by section.</p></article><article class="document-summary-card vault-storage-card"><p class="eyebrow">Encrypted storage</p><p class="document-summary-date">${formatDocumentBytes(totalBytes)} <small>of 50 MB</small></p><div class="document-storage-track" role="progressbar" aria-label="Document storage used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(storagePercent)}"><span style="--document-storage-progress: ${storagePercent}%"></span></div><p>Across every household profile on this device</p></article></section>
      <section class="vault-category-list" aria-label="Document Vault categories">
  <article class="vault-category-row is-active"><span class="vault-category-icon" aria-hidden="true">⌾</span><div><h2>Identity & Immigration</h2><p>Passport and immigration evidence</p></div><span class="vault-category-status">READY</span><span class="vault-category-state" aria-hidden="true">✓</span></article>
  <article class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">⌂</span><div><h2>Address History</h2><p>Proof of address and residence history</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
  <article class="vault-category-row is-warm"><span class="vault-category-icon" aria-hidden="true">▣</span><div><h2>Employment</h2><p>Employer letters and contracts</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
  <article class="vault-category-row is-attention"><span class="vault-category-icon" aria-hidden="true">£</span><div><h2>Salary & Tax</h2><p>Payslips, P60s and tax evidence</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">△</span></article>
  <article class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">✈</span><div><h2>Travel & Absences</h2><p>Travel evidence supporting your timeline</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
  <article class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">◇</span><div><h2>Life in the UK & English</h2><p>Test and English-language evidence</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
  <article class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">♟</span><div><h2>Family / Dependants</h2><p>Relationship and dependant evidence</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
  <article class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">▤</span><div><h2>Final Application Documents</h2><p>Final forms and submission evidence</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
  <article class="vault-category-row"><span class="vault-category-icon" aria-hidden="true">＋</span><div><h2>Additional Documents</h2><p>Anything else supporting the application</p></div><span class="vault-category-status">TO DO</span><span class="vault-category-state" aria-hidden="true">○</span></article>
</section>
<section class="vault-download-panel"><button id="download-document-pack" class="vault-download-button" type="button" ${documents.length === 0 ? "disabled" : ""}><span aria-hidden="true">⇩</span> Download PDF pack</button></section>
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
      body: `<div class="family-form-fields"><div class="family-field family-field-wide"><label for="document-file">Document file</label><input id="document-file" name="documentFile" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /><p class="field-guidance">The file is encrypted before it is stored in this browser.</p></div><div class="family-field family-field-wide"><label for="document-name">Document name</label><input id="document-name" name="displayName" maxlength="100" required /></div><div class="family-field family-field-wide"><label for="document-category">Category</label><select id="document-category" name="category" required><option value="">Choose category</option><option value="passport">Passport</option><option value="immigration-evidence">Immigration evidence</option><option value="address-proof">Address proof</option><option value="other">Other</option></select></div></div><p id="document-form-error" class="form-error" role="alert" hidden></p>`,
      actions:
        '<button class="primary-button family-save-button liquid-dialog-save" type="submit">Encrypt and save document</button>',
      dialogClass: "document-dialog",
      closeLabel: "Close document form",
    })}
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

function createDocumentCard(
  document: DocumentMetadata,
  isFirst: boolean,
  isLast: boolean,
): HTMLElement {
  const card = documentNode("article", "document-card");
  card.innerHTML = `<div class="document-card-main"><span class="document-type-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h4M10 12h6M10 16h6"/></svg></span><div class="document-copy"><h3></h3><p class="document-original-name"></p><div class="document-badges"><span class="document-category"></span><span class="document-size"></span></div></div></div><div class="document-actions"><button class="member-action" type="button" data-open-document>Open</button><button class="member-action" type="button" data-download-document>Download</button><button class="member-action" type="button" data-rename-document>Rename</button><button class="member-action document-order-action" type="button" data-move-document="up" aria-label="Move document up">↑</button><button class="member-action document-order-action" type="button" data-move-document="down" aria-label="Move document down">↓</button><button class="member-action destructive-action" type="button" data-delete-document>Delete</button></div>`;
  const heading = card.querySelector<HTMLElement>("h3");
  const originalName = card.querySelector<HTMLElement>(
    ".document-original-name",
  );
  const category = card.querySelector<HTMLElement>(".document-category");
  const size = card.querySelector<HTMLElement>(".document-size");
  if (heading) heading.textContent = document.displayName;
  if (originalName) originalName.textContent = document.fileName;
  if (category)
    category.textContent = DOCUMENT_CATEGORY_LABELS[document.category];
  if (size) size.textContent = formatDocumentBytes(document.size);
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

export function showDocumentUploadForm(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>("#document-dialog");
  const form = root.querySelector<HTMLFormElement>("#document-form");
  if (!dialog || !form) throw new Error("Document form is unavailable.");
  form.reset();
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
  displayName: string;
  category: DocumentCategory;
  file: File | null;
} {
  const data = new FormData(form);
  const input = form.elements.namedItem("documentFile") as HTMLInputElement;
  return {
    displayName: String(data.get("displayName") ?? "").trim(),
    category: String(data.get("category") ?? "") as DocumentCategory,
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
