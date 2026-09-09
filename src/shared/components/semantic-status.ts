export const SEMANTIC_STATUS_TONES = [
  "success",
  "warning",
  "error",
  "review",
  "info",
  "todo",
] as const;

export type SemanticStatusTone = (typeof SEMANTIC_STATUS_TONES)[number];

const STATUS_ICONS: Record<SemanticStatusTone, string> = {
  success: "✓",
  warning: "!",
  error: "×",
  review: "!",
  info: "i",
  todo: "○",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export interface SemanticStatusOptions {
  label: string;
  tone: SemanticStatusTone;
  className?: string;
}

export function renderSemanticStatus({
  label,
  tone,
  className = "",
}: SemanticStatusOptions): string {
  return `<span class="semantic-status semantic-status-${tone}${className ? ` ${className}` : ""}" data-status-tone="${tone}"><span class="semantic-status-icon" aria-hidden="true">${STATUS_ICONS[tone]}</span><span class="semantic-status-label">${escapeHtml(label)}</span></span>`;
}

export function applySemanticStatus(
  element: HTMLElement,
  label: string,
  tone: SemanticStatusTone,
): void {
  for (const currentTone of SEMANTIC_STATUS_TONES)
    element.classList.remove(`semantic-status-${currentTone}`);
  element.classList.add("semantic-status", `semantic-status-${tone}`);
  element.dataset.statusTone = tone;
  element.innerHTML = `<span class="semantic-status-icon" aria-hidden="true">${STATUS_ICONS[tone]}</span><span class="semantic-status-label"></span>`;
  const labelElement = element.querySelector<HTMLElement>(
    ".semantic-status-label",
  );
  if (labelElement) labelElement.textContent = label;
}
