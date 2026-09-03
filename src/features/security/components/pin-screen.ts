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
      if (input.value && !form.classList.contains("security-keypad-form"))
        inputs[index + 1]?.focus();
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

function renderUnlockKeypad(): string {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const buttons = keys
    .map(
      (digit) =>
        `<button class="security-keypad-key" type="button" data-pin-key="${digit}" aria-label="Enter ${digit}"><span>${digit}</span></button>`,
    )
    .join("");

  return `
    <div class="security-keypad" aria-label="PIN keypad" tabindex="0">
      ${buttons}
      <span class="security-keypad-spacer" aria-hidden="true"></span>
      <button class="security-keypad-key" type="button" data-pin-key="0" aria-label="Enter 0"><span>0</span></button>
      <button class="security-keypad-backspace" type="button" data-pin-backspace aria-label="Delete last PIN digit">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-6-6Z"/><path d="m13 10 4 4M17 10l-4 4"/></svg>
      </button>
    </div>
  `;
}

function updateUnlockIndicators(form: HTMLFormElement): void {
  const inputs = Array.from(
    form.querySelectorAll<HTMLInputElement>('[data-pin-digit="pin"]'),
  );
  const indicators = Array.from(
    form.querySelectorAll<HTMLElement>("[data-pin-indicator]"),
  );
  indicators.forEach((indicator, index) => {
    indicator.classList.toggle("is-filled", Boolean(inputs[index]?.value));
  });
}

function initialiseUnlockKeypad(form: HTMLFormElement): void {
  const inputs = Array.from(
    form.querySelectorAll<HTMLInputElement>('[data-pin-digit="pin"]'),
  );

  const enterDigit = (digit: string): void => {
    const input = inputs.find(({ value }) => value.length === 0);
    if (!input) return;
    input.value = digit;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    updateUnlockIndicators(form);
  };

  const deleteDigit = (): void => {
    let index = inputs.length - 1;
    while (index >= 0 && !inputs[index]?.value) index -= 1;
    const input = inputs[index];
    if (!input) return;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    updateUnlockIndicators(form);
  };

  const popKey = (button: HTMLButtonElement): void => {
    button.classList.remove("is-popping");
    void button.offsetWidth;
    button.classList.add("is-popping");
    button.addEventListener(
      "animationend",
      () => button.classList.remove("is-popping"),
      { once: true },
    );
  };

  for (const button of form.querySelectorAll<HTMLButtonElement>(
    "[data-pin-key]",
  )) {
    button.addEventListener("click", () => {
      popKey(button);
      const digit = button.dataset.pinKey;
      if (digit) enterDigit(digit);
    });
  }

  form
    .querySelector<HTMLButtonElement>("[data-pin-backspace]")
    ?.addEventListener("click", deleteDigit);

  const keypad = form.querySelector<HTMLElement>(".security-keypad");
  keypad?.addEventListener("keydown", (event) => {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const button = form.querySelector<HTMLButtonElement>(
        `[data-pin-key="${event.key}"]`,
      );
      if (button) popKey(button);
      enterDigit(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      deleteDigit();
    }
  });
}

export function renderPinScreen(
  root: HTMLElement,
  mode: PinScreenMode,
): HTMLFormElement {
  const creating = mode === "create";

  if (creating) {
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
            <h1 id="pin-title">Create your four-digit PIN</h1>
            <p>Your PIN will lock information stored on this device.</p>
            <form id="pin-form" class="pin-form" novalidate>
              ${renderPinInputs("pin", "Choose PIN")}
              ${renderPinInputs("confirmPin", "Confirm PIN")}
              <p id="pin-error" class="form-error" role="alert" hidden></p>
              <button class="primary-button" type="submit">Create private space</button>
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
  } else {
    root.innerHTML = `
      <div class="security-shell security-keypad-shell">
        <div class="security-ambient-glow security-ambient-glow-primary" aria-hidden="true"></div>
        <div class="security-ambient-glow security-ambient-glow-secondary" aria-hidden="true"></div>
        <main class="security-main security-keypad-main">
          <section class="security-keypad-screen" aria-labelledby="pin-title">
            <div class="security-logo-mark" aria-hidden="true">
              <img src="./brand-logo.png" alt="" />
            </div>
            <div class="security-keypad-copy">
              <h1 id="pin-title">Enter Security PIN</h1>
              <p>Please enter your 4-digit security code to continue.</p>
            </div>
            <form id="pin-form" class="pin-form security-keypad-form" novalidate>
              <div class="security-hidden-pin-inputs">
                ${renderPinInputs("pin", "Four-digit PIN")}
              </div>
              <div class="security-pin-indicators" aria-hidden="true">
                ${Array.from({ length: 4 }, (_, index) => `<span data-pin-indicator="${index}"></span>`).join("")}
              </div>
              ${renderUnlockKeypad()}
              <p id="pin-error" class="form-error security-keypad-error" role="alert" hidden></p>
              <button id="forgot-pin-reset" class="security-forgot-pin" type="button">Forgot PIN?</button>
            </form>
          </section>
        </main>
        ${renderDeleteDataDialog("locked")}
      </div>
    `;
  }

  const form = root.querySelector<HTMLFormElement>("#pin-form");
  if (!form) {
    throw new Error("PIN form could not be rendered.");
  }

  initialisePinInputs(form, "pin", !creating);
  if (creating) {
    initialisePinInputs(form, "confirmPin", true);
    form.querySelector<HTMLInputElement>('[data-pin-digit="pin"]')?.focus();
  } else {
    initialiseUnlockKeypad(form);
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

export function clearPinInputs(form: HTMLFormElement, name = "pin"): void {
  for (const input of form.querySelectorAll<HTMLInputElement>(
    `[data-pin-digit="${name}"]`,
  )) {
    input.value = "";
  }
  const valueInput = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (valueInput) valueInput.value = "";
  updateUnlockIndicators(form);
  const keypad = form.querySelector<HTMLElement>(".security-keypad");
  if (keypad) keypad.focus();
  else
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
