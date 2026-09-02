import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  type AddressHistoryCoverage,
  type AddressHistoryEntry,
  type AddressHistoryInput,
} from "../domain/address-history";
import type { DocumentMetadata } from "../domain/document";

export function renderAddressHistoryDialog(
  entries: readonly AddressHistoryEntry[],
  coverage: AddressHistoryCoverage,
  requiredStartMonth: string | null,
  monthsRemaining: number | null,
  documents: readonly DocumentMetadata[],
): string {
  const requiredLabel =
    coverage.requiredMonths === null
      ? "Required period will be based on the applicant’s supported settlement route."
      : `${Math.round(coverage.requiredMonths / 12)} years required · ${coverage.coveredMonths} of ${coverage.requiredMonths} months covered`;
  const coverageClass = coverage.complete ? "is-complete" : "needs-attention";
  const guidedStartLabel = requiredStartMonth
    ? `Work backwards from your current address to ${formatMonth(requiredStartMonth)} based on qualifying permission history.`
    : "Work backwards from your current address until a supported qualifying permission is available.";
  const remainingLabel =
    monthsRemaining === null ? "" : `${monthsRemaining} months remaining`;
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
        <div><strong>${coverage.complete ? "Timeline complete" : "Timeline needs attention"}</strong><span>${escapeHtml(requiredLabel)}</span><span>${escapeHtml(guidedStartLabel)}</span>${remainingLabel ? `<span>${escapeHtml(remainingLabel)}</span>` : ""}</div>
        ${gaps}
      </section>
      <section class="address-history-list" aria-label="Recorded addresses">
        ${renderAddressList(entries, documents)}
      </section>
      <input name="addressId" type="hidden" />
      <div class="family-form-fields address-history-fields">
        <div class="family-field family-field-wide"><label for="address-full">Full address</label><textarea id="address-full" name="fullAddress" maxlength="300" rows="3" required></textarea></div>
        <div class="family-field"><label for="address-start">Start month</label><input id="address-start" name="startMonth" type="month" required /></div>
        <div class="family-field" data-address-end-field><label for="address-end">End month</label><input id="address-end" name="endMonth" type="month" /></div>
        <label class="address-current-toggle family-field-wide" data-address-current-field><input id="address-current" name="isCurrent" type="checkbox" /><span>Current address</span></label>
      </div>
      <div class="inline-evidence-attachment" data-address-evidence>
        <div class="inline-evidence-copy"><strong>Address evidence</strong><span>Optional · council tax, tenancy, bank, utility or other proof · PDF, JPG or PNG · up to 5 MB</span><small data-address-existing-evidence>No evidence attached yet</small></div>
        <label class="inline-evidence-picker" for="address-evidence-file"><span>Choose file</span><input id="address-evidence-file" name="addressEvidenceFile" type="file" aria-label="Address evidence" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" /></label>
        <span class="inline-evidence-file-name" data-address-evidence-name>No new file selected</span>
      </div>
      <p id="address-history-error" class="form-error" role="alert" hidden></p>
    </div>`,
    actions:
      '<button id="address-history-reset" class="secondary-button" type="button">New address</button><button class="primary-button family-save-button liquid-dialog-save" type="submit">Save & continue</button>',
    dialogClass: "address-history-dialog",
    closeLabel: "Close address history",
  });
}

function renderAddressList(
  entries: readonly AddressHistoryEntry[],
  documents: readonly DocumentMetadata[],
): string {
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
            <span class="address-proof-count">${renderEvidenceCount(documents, entry.id)}</span>
            <button type="button" class="member-action destructive-action" data-delete-address="${entry.id}">Delete</button>
          </div>
        </article>`,
    )
    .join("");
}

export function showAddressHistoryForm(
  root: HTMLElement,
  entry?: AddressHistoryEntry,
  guidedEndMonth?: string | null,
  documents: readonly DocumentMetadata[] = [],
  firstAddress = false,
): void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "#address-history-dialog",
  );
  const form = root.querySelector<HTMLFormElement>("#address-history-form");
  if (!dialog || !form) throw new Error("Address History form is unavailable.");
  resetAddressHistoryForm(form, guidedEndMonth, firstAddress);
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit)
    submit.textContent = entry
      ? "Save changes"
      : firstAddress || guidedEndMonth
        ? "Save & continue"
        : "Save address";
  if (entry) {
    (form.elements.namedItem("addressId") as HTMLInputElement).value = entry.id;
    (form.elements.namedItem("fullAddress") as HTMLTextAreaElement).value =
      entry.fullAddress;
    const start = form.elements.namedItem("startMonth") as HTMLInputElement;
    start.value = entry.startMonth;
    start.readOnly = false;
    start.setAttribute("aria-readonly", "false");
    const end = form.elements.namedItem("endMonth") as HTMLInputElement;
    end.value = entry.endMonth;
    end.readOnly = false;
    end.setAttribute("aria-readonly", "false");
    const current = form.elements.namedItem("isCurrent") as HTMLInputElement;
    current.checked = entry.isCurrent;
    current.disabled = false;
    syncAddressGuidedFields(form, entry.isCurrent, true);
    syncAddressEndState(form);
  }
  syncAddressEvidenceState(form, entry?.id, documents);
  if (!dialog.open) dialog.showModal();
}

export function resetAddressHistoryForm(
  form: HTMLFormElement,
  guidedEndMonth?: string | null,
  firstAddress = false,
): void {
  form.reset();
  (form.elements.namedItem("addressId") as HTMLInputElement).value = "";
  const start = form.elements.namedItem("startMonth") as HTMLInputElement;
  start.value = "";
  start.readOnly = false;
  start.setAttribute("aria-readonly", "false");
  start.title = "";
  const current = form.elements.namedItem("isCurrent") as HTMLInputElement;
  const end = form.elements.namedItem("endMonth") as HTMLInputElement;
  current.checked = firstAddress;
  current.disabled = firstAddress || Boolean(guidedEndMonth);
  end.value = guidedEndMonth ?? "";
  end.readOnly = Boolean(guidedEndMonth);
  end.setAttribute("aria-readonly", guidedEndMonth ? "true" : "false");
  end.title = guidedEndMonth
    ? "End month is set automatically to prevent a gap with the next address."
    : "";
  const error = form.querySelector<HTMLElement>("#address-history-error");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  syncAddressGuidedFields(form, firstAddress, false);
  syncAddressEndState(form);
  syncAddressEvidenceState(form, undefined, []);
}

export function syncAddressGuidedFields(
  form: HTMLFormElement,
  isCurrentAddress: boolean,
  editing: boolean,
): void {
  const currentField = form.querySelector<HTMLElement>(
    "[data-address-current-field]",
  );
  const endField = form.querySelector<HTMLElement>("[data-address-end-field]");
  if (currentField) currentField.hidden = !isCurrentAddress;
  if (endField) endField.hidden = isCurrentAddress;

  const current = form.elements.namedItem("isCurrent") as HTMLInputElement;
  if (!editing) current.disabled = true;
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
      notes: "",
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

export function readAddressEvidenceFile(form: HTMLFormElement): File | null {
  const input = form.elements.namedItem(
    "addressEvidenceFile",
  ) as HTMLInputElement | null;
  return input?.files?.[0] ?? null;
}

export function syncAddressEvidenceName(form: HTMLFormElement): void {
  const input = form.elements.namedItem(
    "addressEvidenceFile",
  ) as HTMLInputElement | null;
  const label = form.querySelector<HTMLElement>("[data-address-evidence-name]");
  if (!input || !label) return;
  label.textContent = input.files?.[0]?.name ?? "No new file selected";
}

function syncAddressEvidenceState(
  form: HTMLFormElement,
  addressId: string | undefined,
  documents: readonly DocumentMetadata[],
): void {
  const label = form.querySelector<HTMLElement>(
    "[data-address-existing-evidence]",
  );
  if (!label) return;
  const evidence = addressId
    ? documents.filter(
        ({ category, addressHistoryId }) =>
          category === "address-proof" && addressHistoryId === addressId,
      )
    : [];
  if (evidence.length === 0) {
    label.textContent = "No evidence attached yet";
    return;
  }
  label.textContent =
    evidence.length === 1
      ? `Attached: ${evidence[0]?.displayName ?? ""}`
      : `${evidence.length} evidence files already attached`;
}

function renderEvidenceCount(
  documents: readonly DocumentMetadata[],
  addressId: string,
): string {
  const count = documents.filter(
    ({ category, addressHistoryId }) =>
      category === "address-proof" && addressHistoryId === addressId,
  ).length;
  if (count === 0) return "No evidence";
  return count === 1 ? "1 evidence file" : `${count} evidence files`;
}
