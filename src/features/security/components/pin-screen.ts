import { APP_NAME } from "../../../configuration/app-metadata";

export type PinScreenMode = "create" | "unlock";

export function renderPinScreen(
  root: HTMLElement,
  mode: PinScreenMode,
): HTMLFormElement {
  const creating = mode === "create";
  root.innerHTML = `
    <div class="security-shell">
      <header class="public-header">
        <span class="wordmark">
          <span class="wordmark-mark" aria-hidden="true">UF</span>
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
            <label for="pin">${creating ? "Choose PIN" : "Four-digit PIN"}</label>
            <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{4}" maxlength="4" required />
            ${creating ? '<label for="confirm-pin">Confirm PIN</label><input id="confirm-pin" name="confirmPin" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{4}" maxlength="4" required />' : ""}
            <p id="pin-error" class="form-error" role="alert" hidden></p>
            <button class="primary-button" type="submit">${creating ? "Create private space" : "Unlock"}</button>
          </form>
          <aside class="pin-guidance" aria-label="PIN security information">
            <strong>Important</strong>
            <p>A four-digit PIN helps prevent casual access, but it is not equivalent to your device encryption or a strong password.</p>
            <p>There is no PIN recovery. A forgotten PIN will require deleting local data and restoring a backup.</p>
          </aside>
        </section>
      </main>
    </div>
  `;

  const form = root.querySelector<HTMLFormElement>("#pin-form");
  if (!form) {
    throw new Error("PIN form could not be rendered.");
  }
  return form;
}

export function showPinError(form: HTMLFormElement, message: string): void {
  const error = form.querySelector<HTMLElement>("#pin-error");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
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
