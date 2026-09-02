import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import type { DocumentMetadata } from "../domain/document";

export function renderEmploymentDialog(
  documents: readonly DocumentMetadata[],
): string {
  const employerLetterAdded = documents.some(
    ({ category }) => category === "employer-letter",
  );
  const contractAdded = documents.some(
    ({ category }) => category === "employment-contract",
  );

  return renderLiquidGlassDialog({
    id: "employment-dialog",
    labelledBy: "employment-dialog-title",
    formId: "employment-dialog-shell",
    eyebrow: "Employment evidence",
    title: "Add employment documents",
    subtitle:
      "Upload each document independently. The section is complete when both are added.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M5 7h14v12H5Z"/><path d="M9 7V5h6v2M8 11h8M8 15h5"/></svg>',
    body: `<div class="employment-upload-grid">
      ${renderEmploymentUploadForm(
        "employer-letter",
        "Employer letter",
        "Upload the employer letter you plan to rely on.",
        employerLetterAdded,
      )}
      ${renderEmploymentUploadForm(
        "employment-contract",
        "Employment contract",
        "Upload the employment contract supporting your application.",
        contractAdded,
      )}
    </div>`,
    actions: "",
    dialogClass: "employment-dialog",
    formClass: "employment-dialog-shell",
    closeLabel: "Close employment documents",
  });
}

function renderEmploymentUploadForm(
  category: "employer-letter" | "employment-contract",
  label: string,
  guidance: string,
  added: boolean,
): string {
  return `<section class="employment-upload-panel" data-employment-panel="${category}">
    <div class="employment-upload-heading">
      <div><h3>${label}</h3><p>${guidance}</p></div>
      <span class="employment-upload-state">${added ? "Added" : "Pending"}</span>
    </div>
    <form class="employment-upload-form" data-employment-upload="${category}" novalidate>
      <div class="family-field">
        <label for="employment-${category}-file">${label} file</label>
        <input id="employment-${category}-file" name="documentFile" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required />
      </div>
      <div class="family-field">
        <label for="employment-${category}-name">Document name</label>
        <input id="employment-${category}-name" name="displayName" maxlength="100" required />
      </div>
      <p class="form-error" data-employment-error role="alert" hidden></p>
      <button class="primary-button family-save-button" type="submit">Encrypt and save ${label.toLowerCase()}</button>
    </form>
  </section>`;
}
