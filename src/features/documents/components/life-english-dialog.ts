import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import type { DocumentMetadata } from "../domain/document";
import {
  type EnglishRequirementStatus,
  type LifeEnglishInput,
  type LifeEnglishRecord,
  type LifeInUkStatus,
} from "../domain/life-english";

export interface LifeInUkFormInput {
  status: LifeInUkStatus;
  passedDate: string;
  reference: string;
}

export interface EnglishLanguageFormInput {
  status: EnglishRequirementStatus;
  evidenceType: string;
  reference: string;
}

export function renderLifeEnglishDialogs(
  documents: readonly DocumentMetadata[],
): string {
  const lifeEvidence = documents.filter(
    ({ category }) => category === "life-in-uk",
  );
  const englishEvidence = documents.filter(
    ({ category }) => category === "english-language",
  );
  return `${renderLiquidGlassDialog({
    id: "life-in-uk-dialog",
    labelledBy: "life-in-uk-title",
    formId: "life-in-uk-form",
    eyebrow: "Life in the UK",
    title: "Add Life in the UK evidence",
    subtitle:
      "Record the test result or exemption and attach supporting evidence.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M7 4h10v16H7z"/><path d="M10 8h4M10 12h4M10 16h2"/></svg>',
    body: `<div class="life-english-modal"><section class="life-english-panel"><div class="family-form-fields"><div class="family-field family-field-wide"><label for="life-status">Status</label><select id="life-status" name="status"><option value="not-recorded">Not recorded</option><option value="passed">Passed</option><option value="exempt">Exempt / not required</option></select></div><div class="family-field family-field-wide" data-life-passed-details><label for="life-pass-date">Passed date</label><input id="life-pass-date" name="passedDate" type="date" /></div><div class="family-field family-field-wide" data-life-passed-details><label for="life-reference">UAN / reference number <span class="optional-label">Optional</span></label><input id="life-reference" name="reference" maxlength="120" autocomplete="off" /></div></div>${renderEvidenceAttachment("life-evidence-file", "evidenceFile", "Life in the UK evidence", lifeEvidence)}</section><p id="life-in-uk-error" class="form-error" role="alert" hidden></p></div>`,
    actions:
      '<button class="secondary-button" data-form-cancel type="button">Cancel</button><button class="primary-button liquid-dialog-save" type="submit">Save</button>',
    dialogClass: "life-english-dialog",
    formClass: "document-evidence-form",
    closeLabel: "Close Life in the UK evidence",
  })}${renderLiquidGlassDialog({
    id: "english-language-dialog",
    labelledBy: "english-language-title",
    formId: "english-language-form",
    eyebrow: "English language",
    title: "Add English-language evidence",
    subtitle:
      "Record how the English requirement is met or the applicable exemption.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M7 4h10v16H7z"/><path d="M10 8h4M10 12h4M10 16h2"/></svg>',
    body: `<div class="life-english-modal"><section class="life-english-panel"><div class="family-form-fields"><div class="family-field family-field-wide"><label for="english-status">Status</label><select id="english-status" name="status"><option value="not-recorded">Not recorded</option><option value="met">Requirement met</option><option value="exempt">Exempt / not required</option></select></div><div class="family-field family-field-wide" data-english-met-details><label for="english-evidence-type">Evidence type</label><input id="english-evidence-type" name="evidenceType" maxlength="120" placeholder="e.g. approved qualification" /></div><div class="family-field family-field-wide" data-english-met-details><label for="english-reference">Certificate / reference number <span class="optional-label">Optional</span></label><input id="english-reference" name="reference" maxlength="120" autocomplete="off" /></div></div>${renderEvidenceAttachment("english-evidence-file", "evidenceFile", "English evidence", englishEvidence)}</section><p id="english-language-error" class="form-error" role="alert" hidden></p></div>`,
    actions:
      '<button class="secondary-button" data-form-cancel type="button">Cancel</button><button class="primary-button liquid-dialog-save" type="submit">Save</button>',
    dialogClass: "life-english-dialog",
    formClass: "document-evidence-form",
    closeLabel: "Close English-language evidence",
  })}`;
}

export function showLifeInUkForm(
  root: HTMLElement,
  record: LifeEnglishRecord | null,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#life-in-uk-dialog");
  const form = root.querySelector<HTMLFormElement>("#life-in-uk-form");
  if (!dialog || !form) throw new Error("Life in the UK form is unavailable.");
  form.reset();
  if (record) {
    setValue(form, "status", record.lifeInUkStatus);
    setValue(form, "passedDate", record.lifeInUkPassedDate);
    setValue(form, "reference", record.lifeInUkReference);
  }
  syncLifeInUkForm(form);
  setDialogTitle(dialog, record?.lifeInUkStatus !== "not-recorded");
  dialog.showModal();
}

export function showEnglishLanguageForm(
  root: HTMLElement,
  record: LifeEnglishRecord | null,
): void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "#english-language-dialog",
  );
  const form = root.querySelector<HTMLFormElement>("#english-language-form");
  if (!dialog || !form)
    throw new Error("English-language form is unavailable.");
  form.reset();
  if (record) {
    setValue(form, "status", record.englishStatus);
    setValue(form, "evidenceType", record.englishEvidenceType);
    setValue(form, "reference", record.englishReference);
  }
  syncEnglishLanguageForm(form);
  setDialogTitle(dialog, record?.englishStatus !== "not-recorded");
  dialog.showModal();
}

export function syncLifeInUkForm(form: HTMLFormElement): void {
  const status = getValue(form, "status") as LifeInUkStatus;
  const passedDate = form.elements.namedItem("passedDate") as HTMLInputElement;
  passedDate.disabled = status !== "passed";
  passedDate.required = status === "passed";
  if (status !== "passed") passedDate.value = "";
  for (const field of form.querySelectorAll<HTMLElement>(
    "[data-life-passed-details]",
  ))
    field.hidden = status !== "passed";
  setSubmitAvailability(form, status !== "not-recorded");
}

export function syncEnglishLanguageForm(form: HTMLFormElement): void {
  const status = getValue(form, "status") as EnglishRequirementStatus;
  const evidenceType = form.elements.namedItem(
    "evidenceType",
  ) as HTMLInputElement;
  evidenceType.disabled = status !== "met";
  evidenceType.required = status === "met";
  if (status !== "met") evidenceType.value = "";
  for (const field of form.querySelectorAll<HTMLElement>(
    "[data-english-met-details]",
  ))
    field.hidden = status !== "met";
  setSubmitAvailability(form, status !== "not-recorded");
}

export function readLifeInUkForm(form: HTMLFormElement): LifeInUkFormInput {
  return {
    status: getValue(form, "status") as LifeInUkStatus,
    passedDate: getValue(form, "passedDate", ""),
    reference: getValue(form, "reference", "").trim(),
  };
}

export function readEnglishLanguageForm(
  form: HTMLFormElement,
): EnglishLanguageFormInput {
  return {
    status: getValue(form, "status") as EnglishRequirementStatus,
    evidenceType: getValue(form, "evidenceType", "").trim(),
    reference: getValue(form, "reference", "").trim(),
  };
}

export function readEvidenceFile(form: HTMLFormElement): File | null {
  return (
    (form.elements.namedItem("evidenceFile") as HTMLInputElement | null)
      ?.files?.[0] ?? null
  );
}

export function syncEvidenceName(form: HTMLFormElement): void {
  const input = form.elements.namedItem(
    "evidenceFile",
  ) as HTMLInputElement | null;
  const label = form.querySelector<HTMLElement>("[data-evidence-name]");
  if (label && input)
    label.textContent = input.files?.[0]?.name ?? "No new file selected";
}

// Compatibility helpers for the previous combined form wiring. The combined
// dialog is no longer rendered; these can be removed when the page controller
// is split into feature-specific controllers.
export const showLifeEnglishForm = showLifeInUkForm;
export function syncLifeEnglishForm(form: HTMLFormElement): void {
  if (form.id === "life-in-uk-form") syncLifeInUkForm(form);
  if (form.id === "english-language-form") syncEnglishLanguageForm(form);
}
export function syncLifeEnglishEvidenceNames(form: HTMLFormElement): void {
  syncEvidenceName(form);
}
export function readLifeEnglishForm(form: HTMLFormElement): LifeEnglishInput {
  const data = new FormData(form);
  return {
    lifeInUkStatus: String(
      data.get("lifeInUkStatus") ?? "not-recorded",
    ) as LifeInUkStatus,
    lifeInUkPassedDate: String(data.get("lifeInUkPassedDate") ?? ""),
    lifeInUkReference: String(data.get("lifeInUkReference") ?? "").trim(),
    englishStatus: String(
      data.get("englishStatus") ?? "not-recorded",
    ) as EnglishRequirementStatus,
    englishEvidenceType: String(data.get("englishEvidenceType") ?? "").trim(),
    englishReference: String(data.get("englishReference") ?? "").trim(),
    notes: String(data.get("notes") ?? "").trim(),
  };
}
export function readLifeEnglishEvidenceFiles(form: HTMLFormElement): {
  lifeEvidence: File | null;
  englishEvidence: File | null;
} {
  return {
    lifeEvidence:
      (form.elements.namedItem("lifeEvidenceFile") as HTMLInputElement | null)
        ?.files?.[0] ?? null,
    englishEvidence:
      (
        form.elements.namedItem(
          "englishEvidenceFile",
        ) as HTMLInputElement | null
      )?.files?.[0] ?? null,
  };
}

function setValue(form: HTMLFormElement, name: string, value: string): void {
  (
    form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement
  ).value = value;
}

function getValue(
  form: HTMLFormElement,
  name: string,
  fallback = "not-recorded",
): string {
  return String(new FormData(form).get(name) ?? fallback);
}

function setSubmitAvailability(form: HTMLFormElement, enabled: boolean): void {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) submit.disabled = !enabled;
}

function setDialogTitle(dialog: HTMLDialogElement, edit: boolean): void {
  const title = dialog.querySelector<HTMLElement>("h2");
  if (!title) return;
  const subject =
    dialog.id === "life-in-uk-dialog"
      ? "Life in the UK evidence"
      : "English-language evidence";
  title.textContent = `${edit ? "Edit" : "Add"} ${subject}`;
}

function renderEvidenceAttachment(
  id: string,
  name: string,
  label: string,
  existing: readonly DocumentMetadata[],
): string {
  const existingLabel =
    existing.length === 0
      ? "No evidence attached yet"
      : existing.length === 1
        ? `Attached: ${escapeHtml(existing[0]?.displayName ?? "")}`
        : `${existing.length} evidence files already attached`;
  return `<div class="inline-evidence-attachment"><div class="inline-evidence-copy"><strong>${label}</strong><span>Optional · PDF, JPG or PNG · up to 5 MB</span><small>${existingLabel}</small></div><label class="inline-evidence-picker" for="${id}"><span>Choose file</span><input id="${id}" name="${name}" type="file" aria-label="${label}" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" /></label><span class="inline-evidence-file-name" data-evidence-name>No new file selected</span></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
