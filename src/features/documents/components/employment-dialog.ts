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

  return `<dialog id="employment-dialog" class="family-dialog liquid-dialog employment-dialog" aria-labelledby="employment-dialog-title">
    <span class="liquid-dialog-initial-focus" tabindex="-1" autofocus aria-hidden="true"></span>
    <div class="family-form liquid-dialog-form">
      <button class="dialog-close liquid-dialog-close" type="button" aria-label="Close employment documents">×</button>
      <div class="liquid-dialog-header">
        <div class="liquid-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 7h14v12H5Z"/><path d="M9 7V5h6v2M8 11h8M8 15h5"/></svg></div>
        <p class="eyebrow">Employment evidence</p>
        <h2 id="employment-dialog-title">Add employment documents</h2>
        <p class="liquid-dialog-subtitle">Upload each document independently. The section is complete when both are added.</p>
      </div>
      <div class="liquid-dialog-body employment-upload-grid">
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
      </div>
    </div>
  </dialog>`;
}

function renderEmploymentUploadForm(
  category: "employer-letter" | "employment-contract",
  label: string,
  guidance: string,
  added: boolean,
): string {
  return `<form class="employment-upload-form" data-employment-upload="${category}" novalidate>
    <div class="employment-upload-heading">
      <div><h3>${label}</h3><p>${guidance}</p></div>
      <span class="employment-upload-state">${added ? "Added" : "Pending"}</span>
    </div>
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
  </form>`;
}
