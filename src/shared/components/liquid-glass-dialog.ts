export interface LiquidGlassDialogOptions {
  id: string;
  labelledBy: string;
  formId: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  iconSvg?: string;
  body: string;
  actions: string;
  dialogClass?: string;
  formClass?: string;
  headerClass?: string;
  closeLabel: string;
}

export function renderLiquidGlassDialog({
  id,
  labelledBy,
  formId,
  eyebrow,
  title,
  subtitle,
  iconSvg,
  body,
  actions,
  dialogClass = "",
  formClass = "",
  headerClass = "",
  closeLabel,
}: LiquidGlassDialogOptions): string {
  const dialogClasses = ["family-dialog", "liquid-dialog", dialogClass]
    .filter(Boolean)
    .join(" ");
  const formClasses = ["family-form", "liquid-dialog-form", formClass]
    .filter(Boolean)
    .join(" ");
  const headerClasses = ["liquid-dialog-header", headerClass]
    .filter(Boolean)
    .join(" ");

  return `<dialog id="${id}" class="${dialogClasses}" aria-labelledby="${labelledBy}">
    <form id="${formId}" class="${formClasses}" novalidate>
      <button class="dialog-close liquid-dialog-close" type="button" aria-label="${closeLabel}">×</button>
      <div class="${headerClasses}">
        ${iconSvg ? `<div class="liquid-dialog-icon" aria-hidden="true">${iconSvg}</div>` : ""}
        <p class="eyebrow">${eyebrow}</p>
        <h2 id="${labelledBy}">${title}</h2>
        ${subtitle ? `<p class="liquid-dialog-subtitle">${subtitle}</p>` : ""}
      </div>
      <div class="liquid-dialog-body">
        ${body}
      </div>
      <div class="liquid-dialog-actions">
        ${actions}
      </div>
    </form>
  </dialog>`;
}
