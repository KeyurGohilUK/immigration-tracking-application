import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
export function renderEmploymentDialog(): string {
  return renderLiquidGlassDialog({
    id: "employment-dialog",
    labelledBy: "employment-dialog-title",
    formId: "employment-evidence-form",
    eyebrow: "Employment evidence",
    title: "Save evidence",
    subtitle: "PDF, JPG, or PNG · Maximum 5 MB",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M5 7h14v12H5Z"/><path d="M9 7V5h6v2M8 11h8M8 15h5"/></svg>',
    body: `<input name="category" type="hidden" />
      <div class="family-field"><label for="employment-evidence-file" data-employment-file-label>Evidence file</label><input id="employment-evidence-file" name="documentFile" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></div>
      <div class="family-field"><label for="employment-evidence-name">Document name</label><input id="employment-evidence-name" name="displayName" maxlength="100" required /></div>
      <p id="employment-evidence-error" class="form-error" role="alert" hidden></p>`,
    actions:
      '<button class="secondary-button" data-employment-cancel type="button">Cancel</button><button class="primary-button liquid-dialog-save" type="submit">Save</button>',
    dialogClass: "employment-dialog",
    formClass: "employment-evidence-form",
    closeLabel: "Close employment evidence",
  });
}
