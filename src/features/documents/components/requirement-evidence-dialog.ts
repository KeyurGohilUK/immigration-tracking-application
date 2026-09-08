import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type DocumentMetadata,
} from "../domain/document";

const REQUIREMENT_DIALOG_CATEGORIES = [
  "employer-letter",
  "employment-contract",
  "payslip",
  "tax-document",
  "travel-evidence",
  "relationship-evidence",
  "application-form",
  "declaration-consent",
] as const satisfies readonly DocumentCategory[];

export type RequirementDialogCategory =
  (typeof REQUIREMENT_DIALOG_CATEGORIES)[number];

const REQUIREMENT_GUIDANCE: Record<RequirementDialogCategory, string> = {
  "employer-letter":
    "Add the employer letter you intend to rely on for the ILR application.",
  "employment-contract":
    "Add the employment contract that supports the applicant's employment evidence.",
  payslip:
    "Add the payslip evidence you intend to rely on for salary and employment history.",
  "tax-document":
    "Add the relevant P60, tax statement, or equivalent tax evidence.",
  "travel-evidence":
    "Add supporting evidence only where it helps explain or verify a recorded absence.",
  "relationship-evidence":
    "Add relationship or dependant evidence relevant to this applicant's route.",
  "application-form":
    "Add the final application document when it has been produced and checked.",
  "declaration-consent":
    "Add the declarations or consent documents you intend to submit.",
};

function dialogId(category: RequirementDialogCategory): string {
  return `requirement-${category}-dialog`;
}

function formId(category: RequirementDialogCategory): string {
  return `requirement-${category}-form`;
}

export function isRequirementDialogCategory(
  category: DocumentCategory,
): category is RequirementDialogCategory {
  return REQUIREMENT_DIALOG_CATEGORIES.includes(
    category as RequirementDialogCategory,
  );
}

export function renderRequirementEvidenceDialogs(): string {
  return REQUIREMENT_DIALOG_CATEGORIES.map((category) =>
    renderLiquidGlassDialog({
      id: dialogId(category),
      labelledBy: `requirement-${category}-title`,
      formId: formId(category),
      eyebrow: "Encrypted evidence",
      title: `Add ${DOCUMENT_CATEGORY_LABELS[category]}`,
      subtitle: REQUIREMENT_GUIDANCE[category],
      iconSvg:
        '<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h4M10 12h6M10 16h6"/></svg>',
      body: `<input name="documentId" type="hidden" /><input name="category" type="hidden" value="${category}" /><div class="family-form-fields"><div class="family-field family-field-wide"><label for="requirement-${category}-file" data-requirement-file-label>Document file</label><input id="requirement-${category}-file" name="documentFile" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /><p class="field-guidance" data-requirement-file-guidance>The file is encrypted before it is stored in this browser.</p></div><div class="family-field family-field-wide"><label for="requirement-${category}-name">Document name</label><input id="requirement-${category}-name" name="displayName" maxlength="100" required /></div></div><p class="form-error" role="alert" data-requirement-error hidden></p>`,
      actions:
        '<button class="secondary-button" type="button" data-requirement-cancel>Cancel</button><button class="primary-button liquid-dialog-save" type="submit" data-requirement-submit>Encrypt and save document</button>',
      dialogClass: "document-dialog requirement-evidence-dialog",
      formClass: "document-evidence-form requirement-evidence-form",
      closeLabel: `Close ${DOCUMENT_CATEGORY_LABELS[category]} form`,
    }),
  ).join("");
}

export function showRequirementEvidenceForm(
  root: HTMLElement,
  category: RequirementDialogCategory,
  existingDocument?: DocumentMetadata,
): void {
  const dialog = root.querySelector<HTMLDialogElement>(
    `#${dialogId(category)}`,
  );
  const form = root.querySelector<HTMLFormElement>(`#${formId(category)}`);
  if (!dialog || !form)
    throw new Error("Requirement evidence form is unavailable.");
  form.reset();
  (form.elements.namedItem("documentId") as HTMLInputElement).value =
    existingDocument?.id ?? "";
  (form.elements.namedItem("category") as HTMLInputElement).value = category;
  (form.elements.namedItem("displayName") as HTMLInputElement).value =
    existingDocument?.displayName ?? "";
  const fileInput = form.elements.namedItem("documentFile") as HTMLInputElement;
  fileInput.required = !existingDocument;
  const title = dialog.querySelector<HTMLElement>(
    `#requirement-${category}-title`,
  );
  if (title)
    title.textContent = `${existingDocument ? "Edit" : "Add"} ${DOCUMENT_CATEGORY_LABELS[category]}`;
  const fileLabel = dialog.querySelector<HTMLElement>(
    "[data-requirement-file-label]",
  );
  if (fileLabel)
    fileLabel.textContent = existingDocument
      ? "Replacement file (optional)"
      : "Document file";
  const guidance = dialog.querySelector<HTMLElement>(
    "[data-requirement-file-guidance]",
  );
  if (guidance)
    guidance.textContent = existingDocument
      ? `Current file: ${existingDocument.fileName}. Choose a replacement only if needed.`
      : "The file is encrypted before it is stored in this browser.";
  const submit = dialog.querySelector<HTMLButtonElement>(
    "[data-requirement-submit]",
  );
  if (submit) {
    submit.disabled = false;
    submit.textContent = existingDocument
      ? "Save changes"
      : "Encrypt and save document";
  }
  const error = form.querySelector<HTMLElement>("[data-requirement-error]");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  dialog.showModal();
}

export function readRequirementEvidenceForm(form: HTMLFormElement): {
  documentId?: string;
  displayName: string;
  category: RequirementDialogCategory;
  file: File | null;
} {
  const data = new FormData(form);
  const input = form.elements.namedItem("documentFile") as HTMLInputElement;
  return {
    documentId: String(data.get("documentId") ?? "") || undefined,
    displayName: String(data.get("displayName") ?? "").trim(),
    category: String(data.get("category") ?? "") as RequirementDialogCategory,
    file: input.files?.[0] ?? null,
  };
}

export function getRequirementDialogCategories(): readonly RequirementDialogCategory[] {
  return REQUIREMENT_DIALOG_CATEGORIES;
}
