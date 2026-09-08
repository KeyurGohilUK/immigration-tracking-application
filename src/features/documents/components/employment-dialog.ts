import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  type EmploymentRecord,
  type SponsorshipStatus,
} from "../domain/employment";

export function renderEmploymentDialog(): string {
  return renderLiquidGlassDialog({
    id: "employment-dialog",
    labelledBy: "employment-dialog-title",
    formId: "employment-form",
    eyebrow: "Encrypted employment record",
    title: "Employment details",
    subtitle: "Stored only on this device.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M5 7h14v12H5Z"/><path d="M9 7V5h6v2M8 11h8M8 15h5"/></svg>',
    body: `<div class="family-form-fields">
      <div class="family-field family-field-wide"><label for="employment-employer">Employer name</label><input id="employment-employer" name="employerName" maxlength="100" required /></div>
      <div class="family-field family-field-wide"><label for="employment-job-title">Job title</label><input id="employment-job-title" name="jobTitle" maxlength="100" required /></div>
      <div class="family-field family-field-wide"><label for="employment-sponsorship">Sponsorship status</label><select id="employment-sponsorship" name="sponsorshipStatus" required><option value="">Choose status</option><option value="sponsored">Sponsored</option><option value="not-sponsored">Not sponsored</option><option value="unknown">Not sure</option></select></div>
      <div class="family-field"><label for="employment-start">Employment start date</label><input id="employment-start" name="employmentStartDate" type="date" required /></div>
      <div class="family-field"><label for="employment-end">Employment end date <span class="optional-label">Optional</span></label><input id="employment-end" name="employmentEndDate" type="date" /></div>
      <div class="family-field family-field-wide"><label for="employment-salary">Annual salary (£) <span class="optional-label">Optional</span></label><input id="employment-salary" name="annualSalary" type="number" min="0" step="1" inputmode="numeric" /></div>
    </div><p id="employment-letter-status" class="field-guidance"></p><p id="employment-form-error" class="form-error" role="alert" hidden></p>`,
    actions:
      '<button class="primary-button liquid-dialog-save" type="submit">Save employment details</button>',
    dialogClass: "employment-dialog",
    formClass: "employment-form",
    closeLabel: "Close employment details",
  });
}

export function showEmploymentForm(
  root: HTMLElement,
  record: EmploymentRecord | null,
  letterStatus: string,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#employment-dialog");
  const form = root.querySelector<HTMLFormElement>("#employment-form");
  if (!dialog || !form) throw new Error("Employment form is unavailable.");
  form.reset();
  if (record) {
    (form.elements.namedItem("employerName") as HTMLInputElement).value =
      record.employerName;
    (form.elements.namedItem("jobTitle") as HTMLInputElement).value =
      record.jobTitle;
    (
      form.elements.namedItem("sponsorshipStatus") as HTMLSelectElement
    ).value = record.sponsorshipStatus;
    (
      form.elements.namedItem("employmentStartDate") as HTMLInputElement
    ).value = record.employmentStartDate;
    (
      form.elements.namedItem("employmentEndDate") as HTMLInputElement
    ).value = record.employmentEndDate;
    (form.elements.namedItem("annualSalary") as HTMLInputElement).value =
      record.annualSalary === null ? "" : String(record.annualSalary);
  }
  const status = form.querySelector<HTMLElement>("#employment-letter-status");
  if (status) status.textContent = letterStatus;
  const error = form.querySelector<HTMLElement>("#employment-form-error");
  if (error) error.hidden = true;
  dialog.showModal();
}

export function readEmploymentInput(form: HTMLFormElement): {
  employerName: string;
  jobTitle: string;
  sponsorshipStatus: SponsorshipStatus;
  employmentStartDate: string;
  employmentEndDate: string;
  annualSalary: number | null;
} {
  const data = new FormData(form);
  const salary = String(data.get("annualSalary") ?? "").trim();
  return {
    employerName: String(data.get("employerName") ?? "").trim(),
    jobTitle: String(data.get("jobTitle") ?? "").trim(),
    sponsorshipStatus: String(
      data.get("sponsorshipStatus") ?? "",
    ) as SponsorshipStatus,
    employmentStartDate: String(data.get("employmentStartDate") ?? ""),
    employmentEndDate: String(data.get("employmentEndDate") ?? ""),
    annualSalary: salary ? Number(salary) : null,
  };
}
