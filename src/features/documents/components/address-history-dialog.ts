import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  type AddressHistoryCoverage,
  type AddressHistoryEntry,
  type AddressHistoryInput,
} from "../domain/address-history";

export function renderAddressHistoryDialog(
  entries: readonly AddressHistoryEntry[],
  coverage: AddressHistoryCoverage,
  requiredStartMonth: string | null,
): string {
  const requiredLabel =
    coverage.requiredMonths === null
      ? "Required period will be based on the applicant’s supported settlement route."
      : `${Math.round(coverage.requiredMonths / 12)} years required · ${coverage.coveredMonths} of ${coverage.requiredMonths} months covered`;
  const coverageClass = coverage.complete ? "is-complete" : "needs-attention";
  const guidedStartLabel = requiredStartMonth
    ? `Start from ${formatMonth(requiredStartMonth)} based on qualifying permission history.`
    : "Start month will be entered manually until a supported qualifying permission is available.";
  const gaps =
    coverage.gaps.length === 0
      ? coverage.complete
        ? '<p class="address-coverage-ok">✓ Required address timeline is fully covered.</p>'
        : '<p class="field-guidance">Add addresses to build the required timeline.</p>'
      : `<div class="address-gap-list"><strong>Timeline gaps</strong><ul>${coverage.gaps
          .map((gap) => `<li>${escapeHtml(gap)}</li>`)
          .join("")}</ul></div>`;

  return renderLiquidGlassDialog({
    id: "address-history-dialog",
    labelledBy: "address-history-title",
    formId: "address-history-form",
    eyebrow: "Structured ILR evidence",
    title: "Address History",
    subtitle: requiredLabel,
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20H4Z"/><path d="M9 20v-6h6v6"/></svg>',
    body: `<div class="address-history-modal">
      <section class="address-coverage-card ${coverageClass}" aria-label="Address timeline coverage">
        <div><strong>${coverage.complete ? "Timeline complete" : "Timeline needs attention"}</strong><span>${escapeHtml(requiredLabel)}</span><span>${escapeHtml(guidedStartLabel)}</span></div>
        ${gaps}
      </section>
      <section class="address-history-list" aria-label="Recorded addresses">
        ${renderAddressList(entries)}
      </section>
      <input name="addressId" type="hidden" />
      <div class="family-form-fields address-history-fields">
        <div class="family-field family-field-wide"><label for="address-full">Full address</label><textarea id="address-full" name="fullAddress" maxlength="300" rows="3" required></textarea></div>
        <div class="family-field"><label for="address-start">Start month</label><input id="address-start" name="startMonth" type="month" required /></div>
        <div class="family-field"><label for="address-end">End month</label><input id="address-end" name="endMonth" type="month" /></div>
        <label class="address-current-toggle family-field-wide"><input id="address-current" name="isCurrent" type="checkbox" /><span>Current address</span></label>
        <div class="family-field family-field-wide"><label for="address-notes">Notes <span class="optional-label">Optional</span></label><textarea id="address-notes" name="notes" maxlength="500" rows="2"></textarea></div>
      </div>
      <p class="field-guidance">Save the address first, then use “Add proof” beside it to attach council tax, tenancy, bank, utility, HMRC or other supporting evidence.</p>
      <p id="address-history-error" class="form-error" role="alert" hidden></p>
    </div>`,
    actions:
      '<button id="address-history-reset" class="secondary-button" type="button">New address</button><button class="primary-button family-save-button liquid-dialog-save" type="submit">Save & continue</button>',
    dialogClass: "address-history-dialog",
    closeLabel: "Close address history",
  });
}

function renderAddressList(entries: readonly AddressHistoryEntry[]): string {
  if (entries.length === 0)
    return '<div class="address-empty-state"><strong>No addresses recorded yet</strong><span>Add the applicant’s address timeline below.</span></div>';
  return [...entries]
    .sort((left, right) => right.startMonth.localeCompare(left.startMonth))
    .map(
      (entry, index) =>
        `<article class="address-history-item">
          <div class="address-history-copy"><span class="address-number">Address ${index + 1}</span><strong>${escapeHtml(entry.fullAddress)}</strong><small>${formatMonth(entry.startMonth)} – ${entry.isCurrent ? "Present" : formatMonth(entry.endMonth)}</small></div>
          <div class="address-history-actions">
            <button type="button" class="member-action" data-edit-address="${entry.id}">Edit</button>
            <button type="button" class="member-action" data-add-address-proof="${entry.id}">Add proof</button>
            <button type="button" class="member-action destructive-action" data-delete-address="${entry.id}">Delete</button>
          </div>
        </article>`,
    )
    .join("");
}

export function showAddressHistoryForm(
  root: HTMLElement,
  entry?: AddressHistoryEntry,
  suggestedStartMonth?: string | null,
): void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "#address-history-dialog",
  );
  const form = root.querySelector<HTMLFormElement>("#address-history-form");
  if (!dialog || !form) throw new Error("Address History form is unavailable.");
  resetAddressHistoryForm(form, suggestedStartMonth);
  if (entry) {
    (form.elements.namedItem("addressId") as HTMLInputElement).value = entry.id;
    (form.elements.namedItem("fullAddress") as HTMLTextAreaElement).value =
      entry.fullAddress;
    const start = form.elements.namedItem("startMonth") as HTMLInputElement;
    start.value = entry.startMonth;
    start.readOnly = false;
    start.setAttribute("aria-readonly", "false");
    (form.elements.namedItem("endMonth") as HTMLInputElement).value =
      entry.endMonth;
    (form.elements.namedItem("isCurrent") as HTMLInputElement).checked =
      entry.isCurrent;
    (form.elements.namedItem("notes") as HTMLTextAreaElement).value =
      entry.notes;
    syncAddressEndState(form);
  }
  if (!dialog.open) dialog.showModal();
}

export function resetAddressHistoryForm(
  form: HTMLFormElement,
  suggestedStartMonth?: string | null,
): void {
  form.reset();
  (form.elements.namedItem("addressId") as HTMLInputElement).value = "";
  const start = form.elements.namedItem("startMonth") as HTMLInputElement;
  start.value = suggestedStartMonth ?? "";
  start.readOnly = Boolean(suggestedStartMonth);
  start.setAttribute(
    "aria-readonly",
    suggestedStartMonth ? "true" : "false",
  );
  const error = form.querySelector<HTMLElement>("#address-history-error");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  syncAddressEndState(form);
}

export function syncAddressEndState(form: HTMLFormElement): void {
  const current = form.elements.namedItem("isCurrent") as HTMLInputElement;
  const end = form.elements.namedItem("endMonth") as HTMLInputElement;
  end.disabled = current.checked;
  end.required = !current.checked;
  if (current.checked) end.value = "";
}

export function readAddressHistoryForm(form: HTMLFormElement): {
  addressId: string;
  input: AddressHistoryInput;
} {
  const data = new FormData(form);
  const current = form.elements.namedItem("isCurrent") as HTMLInputElement;
  return {
    addressId: String(data.get("addressId") ?? ""),
    input: {
      fullAddress: String(data.get("fullAddress") ?? "").trim(),
      startMonth: String(data.get("startMonth") ?? ""),
      endMonth: current.checked ? "" : String(data.get("endMonth") ?? ""),
      isCurrent: current.checked,
      notes: String(data.get("notes") ?? "").trim(),
    },
  };
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
