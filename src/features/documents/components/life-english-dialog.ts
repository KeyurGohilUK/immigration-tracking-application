import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  type EnglishRequirementStatus,
  type LifeEnglishInput,
  type LifeEnglishRecord,
  type LifeInUkStatus,
} from "../domain/life-english";
import type { DocumentMetadata } from "../domain/document";

export function renderLifeEnglishDialog(
  documents: readonly DocumentMetadata[],
): string {
  const lifeEvidence = documents.filter(
    ({ category }) => category === "life-in-uk",
  );
  const englishEvidence = documents.filter(
    ({ category }) => category === "english-language",
  );
  return renderLiquidGlassDialog({
    id: "life-english-dialog",
    labelledBy: "life-english-title",
    formId: "life-english-form",
    eyebrow: "Structured ILR evidence",
    title: "Life in the UK & English",
    subtitle:
      "Store the result details and references you may need when preparing the application.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M7 4h10v16H7z"/><path d="M10 8h4M10 12h4M10 16h2"/></svg>',
    body: `<div class="life-english-modal">
      <section class="life-english-panel">
        <div class="section-heading"><div><p class="eyebrow">Life in the UK</p><h3>Test details</h3></div></div>
        <div class="family-form-fields">
          <div class="family-field family-field-wide"><label for="life-status">Status</label><select id="life-status" name="lifeInUkStatus"><option value="not-recorded">Not recorded</option><option value="passed">Passed</option><option value="exempt">Exempt / not required</option></select></div>
          <div class="family-field family-field-wide" data-life-passed-details><label for="life-pass-date">Passed date</label><input id="life-pass-date" name="lifeInUkPassedDate" type="date" /></div>
          <div class="family-field family-field-wide" data-life-passed-details><label for="life-reference">UAN / reference number <span class="optional-label">Optional</span></label><input id="life-reference" name="lifeInUkReference" maxlength="120" autocomplete="off" /></div>
        </div>
        ${renderEvidenceAttachment(
          "life-evidence-file",
          "lifeEvidenceFile",
          "Life in the UK evidence",
          lifeEvidence,
          "life",
        )}
      </section>
      <section class="life-english-panel">
        <div class="section-heading"><div><p class="eyebrow">English requirement</p><h3>Evidence details</h3></div></div>
        <div class="family-form-fields">
          <div class="family-field family-field-wide"><label for="english-status">Status</label><select id="english-status" name="englishStatus"><option value="not-recorded">Not recorded</option><option value="met">Requirement met</option><option value="exempt">Exempt / not required</option></select></div>
          <div class="family-field family-field-wide" data-english-met-details><label for="english-evidence-type">Evidence type</label><input id="english-evidence-type" name="englishEvidenceType" maxlength="120" placeholder="e.g. approved qualification" /></div>
          <div class="family-field family-field-wide" data-english-met-details><label for="english-reference">Certificate / reference number <span class="optional-label">Optional</span></label><input id="english-reference" name="englishReference" maxlength="120" autocomplete="off" /></div>
        </div>
        ${renderEvidenceAttachment(
          "english-evidence-file",
          "englishEvidenceFile",
          "English evidence",
          englishEvidence,
          "english",
        )}
      </section>
      <div class="family-field"><label for="life-english-notes">Notes <span class="optional-label">Optional</span></label><textarea id="life-english-notes" name="notes" maxlength="500" rows="3"></textarea></div>
      <p id="life-english-error" class="form-error" role="alert" hidden></p>
    </div>`,
    actions:
      '<button class="primary-button liquid-dialog-save" type="submit">Save details</button>',
    dialogClass: "life-english-dialog",
    closeLabel: "Close Life in the UK and English",
  });
}

export function showLifeEnglishForm(
  root: HTMLElement,
  record: LifeEnglishRecord | null,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#life-english-dialog");
  const form = root.querySelector<HTMLFormElement>("#life-english-form");
  if (!dialog || !form)
    throw new Error("Life in the UK and English form is unavailable.");
  form.reset();
  if (record) {
    (form.elements.namedItem("lifeInUkStatus") as HTMLSelectElement).value =
      record.lifeInUkStatus;
    (form.elements.namedItem("lifeInUkPassedDate") as HTMLInputElement).value =
      record.lifeInUkPassedDate;
    (form.elements.namedItem("lifeInUkReference") as HTMLInputElement).value =
      record.lifeInUkReference;
    (form.elements.namedItem("englishStatus") as HTMLSelectElement).value =
      record.englishStatus;
    (form.elements.namedItem("englishEvidenceType") as HTMLInputElement).value =
      record.englishEvidenceType;
    (form.elements.namedItem("englishReference") as HTMLInputElement).value =
      record.englishReference;
    (form.elements.namedItem("notes") as HTMLTextAreaElement).value =
      record.notes;
  }
  syncLifeEnglishForm(form);
  if (!dialog.open) dialog.showModal();
}

export function syncLifeEnglishForm(form: HTMLFormElement): void {
  const lifeStatus = (
    form.elements.namedItem("lifeInUkStatus") as HTMLSelectElement
  ).value as LifeInUkStatus;
  const passDate = form.elements.namedItem(
    "lifeInUkPassedDate",
  ) as HTMLInputElement;
  passDate.disabled = lifeStatus !== "passed";
  passDate.required = lifeStatus === "passed";
  if (lifeStatus !== "passed") passDate.value = "";
  for (const field of form.querySelectorAll<HTMLElement>(
    "[data-life-passed-details]",
  ))
    field.hidden = lifeStatus !== "passed";
  const lifeEvidence = form.querySelector<HTMLElement>("[data-life-evidence]");
  if (lifeEvidence) lifeEvidence.hidden = lifeStatus === "not-recorded";

  const englishStatus = (
    form.elements.namedItem("englishStatus") as HTMLSelectElement
  ).value as EnglishRequirementStatus;
  const evidenceType = form.elements.namedItem(
    "englishEvidenceType",
  ) as HTMLInputElement;
  evidenceType.disabled = englishStatus !== "met";
  evidenceType.required = englishStatus === "met";
  if (englishStatus !== "met") evidenceType.value = "";
  for (const field of form.querySelectorAll<HTMLElement>(
    "[data-english-met-details]",
  ))
    field.hidden = englishStatus !== "met";
  const englishEvidence = form.querySelector<HTMLElement>(
    "[data-english-evidence]",
  );
  if (englishEvidence)
    englishEvidence.hidden = englishStatus === "not-recorded";
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
  const lifeInput = form.elements.namedItem(
    "lifeEvidenceFile",
  ) as HTMLInputElement | null;
  const englishInput = form.elements.namedItem(
    "englishEvidenceFile",
  ) as HTMLInputElement | null;
  return {
    lifeEvidence: lifeInput?.files?.[0] ?? null,
    englishEvidence: englishInput?.files?.[0] ?? null,
  };
}

export function syncLifeEnglishEvidenceNames(form: HTMLFormElement): void {
  syncEvidenceName(form, "lifeEvidenceFile", "[data-life-evidence-name]");
  syncEvidenceName(form, "englishEvidenceFile", "[data-english-evidence-name]");
}

function syncEvidenceName(
  form: HTMLFormElement,
  inputName: string,
  selector: string,
): void {
  const input = form.elements.namedItem(inputName) as HTMLInputElement | null;
  const label = form.querySelector<HTMLElement>(selector);
  if (!label || !input) return;
  label.textContent = input.files?.[0]?.name ?? "No new file selected";
}

function renderEvidenceAttachment(
  id: string,
  name: string,
  label: string,
  existing: readonly DocumentMetadata[],
  type: "life" | "english",
): string {
  const existingLabel =
    existing.length === 0
      ? "No evidence attached yet"
      : existing.length === 1
        ? `Attached: ${escapeHtml(existing[0]?.displayName ?? "")}`
        : `${existing.length} evidence files already attached`;
  return `<div class="inline-evidence-attachment" data-${type}-evidence>
    <div class="inline-evidence-copy"><strong>${label}</strong><span>Optional · PDF, JPG or PNG · up to 5 MB</span><small>${existingLabel}</small></div>
    <label class="inline-evidence-picker" for="${id}"><span>Choose file</span><input id="${id}" name="${name}" type="file" aria-label="${label}" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" /></label>
    <span class="inline-evidence-file-name" data-${type}-evidence-name>No new file selected</span>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
