import { APP_NAME } from "../../../configuration/app-metadata";
import { renderDeleteDataDialog } from "../../settings/components/delete-data-dialog";

export type PinScreenMode = "create" | "unlock";

function renderPinInputs(name: string, label: string): string {
  const inputs = Array.from(
    { length: 4 },
    (_, index) => `
      <input
        class="pin-digit"
        data-pin-digit="${name}"
        type="password"
        inputmode="numeric"
        autocomplete="${index === 0 ? "one-time-code" : "off"}"
        pattern="[0-9]"
        maxlength="1"
        aria-label="${label} digit ${index + 1}"
        required
      />`,
  ).join("");

  return `
    <fieldset class="pin-fieldset">
      <legend>${label}</legend>
      <div class="pin-inputs" role="group" aria-label="${label}">
        ${inputs}
      </div>
      <input type="hidden" name="${name}" />
    </fieldset>
  `;
}

function initialisePinInputs(
  form: HTMLFormElement,
  name: string,
  autoSubmit: boolean,
): void {
  const inputs = Array.from(
    form.querySelectorAll<HTMLInputElement>(`[data-pin-digit="${name}"]`),
  );
  const valueInput = form.querySelector<HTMLInputElement>(`[name="${name}"]`);

  const updateValue = (): void => {
    if (!valueInput) return;
    valueInput.value = inputs.map((input) => input.value).join("");
    if (autoSubmit && valueInput.value.length === inputs.length) {
      form.requestSubmit();
    }
  };

  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      const error = form.querySelector<HTMLElement>("#pin-error");
      if (error) error.hidden = true;
      input.value = input.value.replace(/\D/g, "").slice(-1);
      if (input.value) inputs[index + 1]?.focus();
      updateValue();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1]?.focus();
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        inputs[index - 1]?.focus();
      } else if (event.key === "ArrowRight" && index < inputs.length - 1) {
        event.preventDefault();
        inputs[index + 1]?.focus();
      }
    });

    input.addEventListener("paste", (event) => {
      const digits = event.clipboardData
        ?.getData("text")
        .replace(/\D/g, "")
        .slice(0, inputs.length);
      if (!digits) return;

      event.preventDefault();
      digits.split("").forEach((digit, digitIndex) => {
        const digitInput = inputs[digitIndex];
        if (digitInput) digitInput.value = digit;
      });
      inputs[Math.min(digits.length, inputs.length) - 1]?.focus();
      updateValue();
    });
  });
}

export function renderPinScreen(
  root: HTMLElement,
  mode: PinScreenMode,
): HTMLFormElement {
  const creating = mode === "create";
  root.innerHTML = `
    <div class="security-shell">
      <header class="public-header">
        <span class="wordmark">
          <img class="wordmark-logo" src="./brand-logo.png" alt="" />
          <span>${APP_NAME}</span>
        </span>
      </header>
      <main class="security-main">
        <section class="security-card" aria-labelledby="pin-title">
          <p class="eyebrow">Local privacy</p>
          <h1 id="pin-title">${creating ? "Create your four-digit PIN" : "Unlock your private space"}</h1>
          <p>
            ${creating ? "Your PIN will lock information stored on this device." : "Enter your PIN to access information stored on this device."}
          </p>
          <form id="pin-form" class="pin-form" novalidate>
            ${renderPinInputs("pin", creating ? "Choose PIN" : "Four-digit PIN")}
            ${creating ? renderPinInputs("confirmPin", "Confirm PIN") : ""}
            <p id="pin-error" class="form-error" role="alert" hidden></p>
            <button class="primary-button" type="submit">${creating ? "Create private space" : "Unlock"}</button>
          </form>
          <aside class="pin-guidance" aria-label="PIN security information">
            <strong>Important</strong>
            <p>A four-digit PIN helps prevent casual access, but it is not equivalent to your device encryption or a strong password.</p>
            <p>There is no PIN recovery. A forgotten PIN will require deleting local data and restoring a backup.</p>
          </aside>
          ${
            creating
              ? ""
              : `<aside class="pin-reset danger-zone" aria-labelledby="pin-reset-title">
                  <p class="eyebrow">Danger Zone</p>
                  <h2 id="pin-reset-title">Forgot your PIN?</h2>
                  <p>The PIN cannot be recovered. Reset only if you accept losing these local records or already have an encrypted backup and its password.</p>
                  <button id="forgot-pin-reset" class="secondary-button danger-button" type="button">Reset local data</button>
                </aside>`
          }
        </section>
      </main>
      ${creating ? "" : renderDeleteDataDialog("locked")}
    </div>
  `;

  const form = root.querySelector<HTMLFormElement>("#pin-form");
  if (!form) {
    throw new Error("PIN form could not be rendered.");
  }

  initialisePinInputs(form, "pin", !creating);
  if (creating) initialisePinInputs(form, "confirmPin", true);
  form.querySelector<HTMLInputElement>('[data-pin-digit="pin"]')?.focus();

  return form;
}

export function showPinError(form: HTMLFormElement, message: string): void {
  const error = form.querySelector<HTMLElement>("#pin-error");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}

export function clearPinInputs(form: HTMLFormElement, name = "pin"): void {
  for (const input of form.querySelectorAll<HTMLInputElement>(
    `[data-pin-digit="${name}"]`,
  )) {
    input.value = "";
  }
  const valueInput = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (valueInput) valueInput.value = "";
  form.querySelector<HTMLInputElement>(`[data-pin-digit="${name}"]`)?.focus();
}

export function setPinFormBusy(form: HTMLFormElement, busy: boolean): void {
  for (const control of form.elements) {
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLButtonElement
    ) {
      control.disabled = busy;
    }
  }
}
