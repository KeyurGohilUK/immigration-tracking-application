import {
  renderSemanticStatus,
  type SemanticStatusTone,
} from "./semantic-status";

export type UiStateKind = "loading" | "empty" | "error";

export interface UiStateOptions {
  kind: UiStateKind;
  title: string;
  message: string;
  statusLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function stateTone(kind: UiStateKind): SemanticStatusTone {
  if (kind === "error") return "error";
  if (kind === "loading") return "info";
  return "todo";
}

function stateStatusLabel(kind: UiStateKind): string {
  if (kind === "error") return "Data problem";
  if (kind === "loading") return "Loading";
  return "Nothing here yet";
}

export function createUiState(options: UiStateOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = `ui-state ui-state-${options.kind}`;
  if (options.kind === "loading") {
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-busy", "true");
  } else if (options.kind === "error") {
    container.setAttribute("role", "alert");
  }

  container.innerHTML =
    `<div class="ui-state-indicator" aria-hidden="true"></div>` +
    `<div class="ui-state-copy">${renderSemanticStatus({
      label: options.statusLabel ?? stateStatusLabel(options.kind),
      tone: stateTone(options.kind),
      className: "ui-state-status",
    })}<strong class="ui-state-title"></strong><p class="ui-state-message"></p></div>`;

  const title = container.querySelector<HTMLElement>(".ui-state-title");
  const message = container.querySelector<HTMLElement>(".ui-state-message");
  if (title) title.textContent = options.title;
  if (message) message.textContent = options.message;

  if (options.actionLabel) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-button ui-state-action";
    action.textContent = options.actionLabel;
    action.addEventListener("click", () => options.onAction?.());
    container.append(action);
  }

  return container;
}

export interface ButtonBusyState {
  restore(): void;
}

export function setButtonBusy(
  button: HTMLButtonElement,
  busyLabel: string,
): ButtonBusyState {
  const originalDisabled = button.disabled;
  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = busyLabel;

  return {
    restore(): void {
      button.disabled = originalDisabled;
      button.removeAttribute("aria-busy");
      button.innerHTML = originalHtml;
    },
  };
}
