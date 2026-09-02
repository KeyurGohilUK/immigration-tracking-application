import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  formatStructuredAddress,
  type AddressHistoryCoverage,
  type AddressHistoryEntry,
  type AddressHistoryInput,
  type StructuredAddress,
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
  const requiredTimelineReached = monthsRemaining === 0;
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
      <div data-address-new-current-host></div>
      ${entries.some(({ isCurrent }) => isCurrent) ? '<button id="address-add-new-current" class="secondary-button" type="button">Add new current address</button>' : ""}
      <section class="address-history-list" aria-label="Recorded addresses">
        ${renderAddressList(entries, documents)}
      </section>
      <input name="addressId" type="hidden" />
      <input name="addressMoveMode" type="hidden" value="false" />
      <div data-address-previous-host>
      <div data-address-entry-fields${requiredTimelineReached ? " hidden" : ""}>
      <div class="family-form-fields address-history-fields">
        <div class="family-field family-field-wide"><strong data-address-full-label>Current address</strong><span class="field-guidance">Enter the UK address in separate fields.</span></div>
        <div class="family-field family-field-wide"><label for="address-flat-building">Flat / building <span class="field-optional">Optional</span></label><input id="address-flat-building" name="flatBuilding" maxlength="100" autocomplete="address-line1" /></div>
        <div class="family-field"><label for="address-house">House number / name</label><input id="address-house" name="houseNumberName" maxlength="100" required autocomplete="address-line1" /></div>
        <div class="family-field"><label for="address-street">Street</label><input id="address-street" name="street" maxlength="120" required autocomplete="address-line2" /></div>
        <div class="family-field"><label for="address-locality">Locality <span class="field-optional">Optional</span></label><input id="address-locality" name="locality" maxlength="100" autocomplete="address-line3" /></div>
        <div class="family-field"><label for="address-town">Town / city</label><input id="address-town" name="townCity" maxlength="100" required autocomplete="address-level2" /></div>
        <div class="family-field"><label for="address-county">County <span class="field-optional">Optional</span></label><input id="address-county" name="county" maxlength="100" autocomplete="address-level1" /></div>
        <div class="family-field"><label for="address-postcode">Postcode</label><input id="address-postcode" name="postcode" maxlength="20" required autocomplete="postal-code" autocapitalize="characters" /></div>
        <div class="family-field"><label for="address-start">Start month</label><input id="address-start" name="startMonth" type="month" required /></div>
        <div class="family-field" data-address-end-field><label for="address-end">End month</label><input id="address-end" name="endMonth" type="month" /></div>
        <label class="address-current-toggle family-field-wide" data-address-current-field><input id="address-current" name="isCurrent" type="checkbox" /><span>This is my current address</span></label>
      </div>
      <div class="inline-evidence-attachment" data-address-evidence>
        <div class="inline-evidence-copy"><strong>Address evidence</strong><span>Optional · council tax, tenancy, bank, utility or other proof · PDF, JPG or PNG · up to 5 MB</span><small data-address-existing-evidence>No evidence attached yet</small></div>
        <label class="inline-evidence-picker" for="address-evidence-file"><span>Choose file</span><input id="address-evidence-file" name="addressEvidenceFile" type="file" aria-label="Address evidence" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" /></label>
        <span class="inline-evidence-file-name" data-address-evidence-name>No new file selected</span>
      </div>
      <p id="address-history-error" class="form-error" role="alert" hidden></p>
      <div class="address-context-actions">
        <button class="secondary-button" data-address-cancel type="button" hidden>Cancel</button>
        <button class="primary-button family-save-button liquid-dialog-save" data-address-submit type="submit">Save & continue</button>
      </div>
      </div>
      </div>
    </div>`,
    actions: "",
    dialogClass: "address-history-dialog",
    closeLabel: "Close address history",
  });
}

function renderAddressList(
  entries: readonly AddressHistoryEntry[],
  documents: readonly DocumentMetadata[],
): string {
  if (entries.length === 0) return "";
  return getDisplayAddresses(entries)
    .map(({ entry, label }) => {
      return `<article class="address-history-item" data-address-item="${entry.id}">
          <div class="address-history-copy"><span class="address-number">${label}</span><strong>${escapeHtml(entry.fullAddress)}</strong><small>${formatMonth(entry.startMonth)} – ${entry.isCurrent ? "Present" : formatMonth(entry.endMonth)}</small></div>
          <div class="address-history-actions">
            <button type="button" class="member-action" data-edit-address="${entry.id}">Edit</button>
            <span class="address-proof-count">${renderEvidenceCount(documents, entry.id)}</span>
            <button type="button" class="member-action destructive-action" data-delete-address="${entry.id}">Delete</button>
          </div>
          <div data-address-edit-host="${entry.id}"></div>
        </article>`;
    })
    .join("");
}

export function renderReadOnlyAddressList(
  entries: readonly AddressHistoryEntry[],
): string {
  if (entries.length === 0) return "";
  const currentAddressWarning = entries.some(({ isCurrent }) => isCurrent)
    ? ""
    : '<p class="vault-address-current-warning"><strong>No current address recorded</strong><span>Add the current residence to repair the timeline. Previous addresses have not been changed.</span></p>';
  return `<section class="vault-address-summary" aria-labelledby="vault-address-summary-title"><strong id="vault-address-summary-title">Saved addresses</strong>${currentAddressWarning}<ol aria-label="Saved addresses">${getDisplayAddresses(
    entries,
  )
    .map(
      ({ entry, label }) =>
        `<li><span class="address-number">${label}</span><strong>${escapeHtml(entry.fullAddress)}</strong><small>${formatMonth(entry.startMonth)} – ${entry.isCurrent ? "Present" : formatMonth(entry.endMonth)}</small></li>`,
    )
    .join("")}</ol></section>`;
}

function getDisplayAddresses(
  entries: readonly AddressHistoryEntry[],
): { entry: AddressHistoryEntry; label: string }[] {
  let previousAddressNumber = 0;
  return [...entries]
    .sort((left, right) => right.startMonth.localeCompare(left.startMonth))
    .map((entry) => ({
      entry,
      label: entry.isCurrent
        ? "Current address"
        : `Previous address ${(previousAddressNumber += 1)}`,
    }));
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
  placeAddressEntryForm(
    form,
    entry?.isCurrent || firstAddress
      ? "current"
      : entry?.id
        ? "edit"
        : "previous",
    entry?.id,
  );
  setAddressContextMode(form, entry ? "edit" : "previous");
  setAddressEntryVisibility(form, true);
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit)
    submit.textContent = entry
      ? "Save"
      : firstAddress || guidedEndMonth
        ? "Save & continue"
        : "Save address";
  if (entry) {
    (form.elements.namedItem("addressId") as HTMLInputElement).value = entry.id;
    writeStructuredAddressFields(
      form,
      entry.address ?? parseLegacyAddress(entry.fullAddress),
    );
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

export function showNewCurrentAddressForm(
  root: HTMLElement,
  documents: readonly DocumentMetadata[] = [],
): void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "#address-history-dialog",
  );
  const form = root.querySelector<HTMLFormElement>("#address-history-form");
  if (!dialog || !form) throw new Error("Address History form is unavailable.");
  resetAddressHistoryForm(form, null, true);
  placeAddressEntryForm(form, "new-current");
  setAddressContextMode(form, "new-current");
  setAddressEntryVisibility(form, true);
  const moveMode = form.elements.namedItem(
    "addressMoveMode",
  ) as HTMLInputElement;
  moveMode.value = "true";
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) submit.textContent = "Save new current address";
  syncAddressEvidenceState(form, undefined, documents);
  if (!dialog.open) dialog.showModal();
}

export function resetAddressHistoryForm(
  form: HTMLFormElement,
  guidedEndMonth?: string | null,
  firstAddress = false,
): void {
  form.reset();
  (form.elements.namedItem("addressId") as HTMLInputElement).value = "";
  const moveMode = form.elements.namedItem(
    "addressMoveMode",
  ) as HTMLInputElement | null;
  if (moveMode) moveMode.value = "false";
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

function placeAddressEntryForm(
  form: HTMLFormElement,
  mode: "current" | "previous" | "new-current" | "edit",
  addressId?: string,
): void {
  const fields = form.querySelector<HTMLElement>("[data-address-entry-fields]");
  if (!fields) return;

  const host =
    mode === "current" || mode === "new-current"
      ? form.querySelector<HTMLElement>("[data-address-new-current-host]")
      : mode === "edit" && addressId
        ? form.querySelector<HTMLElement>(
            `[data-address-edit-host="${CSS.escape(addressId)}"]`,
          )
        : form.querySelector<HTMLElement>("[data-address-previous-host]");

  host?.append(fields);
  const addCurrent = form.querySelector<HTMLButtonElement>(
    "#address-add-new-current",
  );
  if (addCurrent) addCurrent.hidden = mode === "new-current";
}

function setAddressContextMode(
  form: HTMLFormElement,
  mode: "previous" | "new-current" | "edit",
): void {
  const cancel = form.querySelector<HTMLButtonElement>("[data-address-cancel]");
  if (cancel) cancel.hidden = mode === "previous";
}

export function restoreAddressHistoryOverview(
  root: HTMLElement,
  previousEndMonth: string | null,
  firstAddress: boolean,
  showPreviousEntry: boolean,
): void {
  const form = root.querySelector<HTMLFormElement>("#address-history-form");
  if (!form) return;
  resetAddressHistoryForm(form, previousEndMonth, firstAddress);
  placeAddressEntryForm(form, "previous");
  setAddressContextMode(form, "previous");
  setAddressEntryVisibility(form, showPreviousEntry);
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit)
    submit.textContent =
      firstAddress || previousEndMonth ? "Save & continue" : "Save address";
}

function setAddressEntryVisibility(
  form: HTMLFormElement,
  visible: boolean,
): void {
  const fields = form.querySelector<HTMLElement>("[data-address-entry-fields]");
  const submit = form.querySelector<HTMLButtonElement>("[data-address-submit]");
  if (fields) fields.hidden = !visible;
  if (submit) submit.hidden = !visible;
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
  const addressLabel = form.querySelector<HTMLElement>(
    "[data-address-full-label]",
  );
  if (addressLabel)
    addressLabel.textContent = isCurrentAddress
      ? "Current address"
      : "Previous address";

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
  movingHome: boolean;
  input: AddressHistoryInput;
} {
  const data = new FormData(form);
  const current = form.elements.namedItem("isCurrent") as HTMLInputElement;
  const address = readStructuredAddressFields(data);
  return {
    addressId: String(data.get("addressId") ?? ""),
    movingHome: String(data.get("addressMoveMode") ?? "false") === "true",
    input: {
      fullAddress: formatStructuredAddress(address),
      address,
      startMonth: String(data.get("startMonth") ?? ""),
      endMonth: current.checked ? "" : String(data.get("endMonth") ?? ""),
      isCurrent: current.checked,
      notes: "",
    },
  };
}

function readStructuredAddressFields(data: FormData): StructuredAddress {
  return {
    flatBuilding: String(data.get("flatBuilding") ?? "").trim(),
    houseNumberName: String(data.get("houseNumberName") ?? "").trim(),
    street: String(data.get("street") ?? "").trim(),
    locality: String(data.get("locality") ?? "").trim(),
    townCity: String(data.get("townCity") ?? "").trim(),
    county: String(data.get("county") ?? "").trim(),
    postcode: String(data.get("postcode") ?? "")
      .trim()
      .toUpperCase(),
  };
}

function writeStructuredAddressFields(
  form: HTMLFormElement,
  address: StructuredAddress,
): void {
  const values: Array<[keyof StructuredAddress, string]> = [
    ["flatBuilding", address.flatBuilding],
    ["houseNumberName", address.houseNumberName],
    ["street", address.street],
    ["locality", address.locality],
    ["townCity", address.townCity],
    ["county", address.county],
    ["postcode", address.postcode],
  ];
  for (const [name, value] of values) {
    const input = form.elements.namedItem(name) as HTMLInputElement | null;
    if (input) input.value = value;
  }
}

function parseLegacyAddress(fullAddress: string): StructuredAddress {
  const parts = fullAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const postcodeIndex = parts.findIndex((part) =>
    /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(part),
  );
  const postcode = postcodeIndex >= 0 ? (parts[postcodeIndex] ?? "") : "";
  const beforePostcode =
    postcodeIndex >= 0 ? parts.slice(0, postcodeIndex) : [...parts];
  return {
    flatBuilding: "",
    houseNumberName: beforePostcode[0] ?? fullAddress.trim(),
    street: beforePostcode[1] ?? "",
    locality: beforePostcode.length > 4 ? (beforePostcode[2] ?? "") : "",
    townCity:
      beforePostcode.length >= 3
        ? (beforePostcode[beforePostcode.length - 2] ?? "")
        : "",
    county:
      beforePostcode.length >= 2
        ? (beforePostcode[beforePostcode.length - 1] ?? "")
        : "",
    postcode,
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
