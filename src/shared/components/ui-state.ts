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

export interface UiStateSemantics {
  role: "status" | "alert" | null;
  ariaLive: "polite" | null;
  ariaBusy: boolean;
  statusLabel: string;
  tone: SemanticStatusTone;
}

export function getUiStateSemantics(kind: UiStateKind): UiStateSemantics {
  return {
    role: kind === "loading" ? "status" : kind === "error" ? "alert" : null,
    ariaLive: kind === "loading" ? "polite" : null,
    ariaBusy: kind === "loading",
    statusLabel: stateStatusLabel(kind),
    tone: stateTone(kind),
  };
}

export function createUiState(options: UiStateOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = `ui-state ui-state-${options.kind}`;
  const semantics = getUiStateSemantics(options.kind);
  if (semantics.role) container.setAttribute("role", semantics.role);
  if (semantics.ariaLive)
    container.setAttribute("aria-live", semantics.ariaLive);
  if (semantics.ariaBusy) container.setAttribute("aria-busy", "true");

  container.innerHTML =
    `<div class="ui-state-indicator" aria-hidden="true"></div>` +
    `<div class="ui-state-copy">${renderSemanticStatus({
      label: options.statusLabel ?? semantics.statusLabel,
      tone: semantics.tone,
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
