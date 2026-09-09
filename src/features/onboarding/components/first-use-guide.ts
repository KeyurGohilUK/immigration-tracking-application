import { createLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  saveOnboardingPreference,
  type OnboardingPreference,
} from "../services/onboarding-preference";

interface FirstUseGuideOptions {
  mode: "first-use" | "replay";
  onClose?: () => void;
}

export function showFirstUseGuide(
  root: HTMLElement,
  { mode, onClose }: FirstUseGuideOptions,
): void {
  root.querySelector("#first-use-guide-dialog")?.remove();
  const isFirstUse = mode === "first-use";
  const dialog = createLiquidGlassDialog({
    id: "first-use-guide-dialog",
    labelledBy: "first-use-guide-title",
    formId: "first-use-guide-form",
    eyebrow: "Welcome to your private tracker",
    title: "Before you begin",
    subtitle:
      "Three important things to know about protecting your records and using UrbanFox responsibly.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4.4 2.7 7.5 7 9 4.3-1.5 7-4.6 7-9V7Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    body: `<div class="first-use-guide-list">
      <section><span aria-hidden="true">1</span><div><h3>Stored only on this device</h3><p>Your household records and documents are encrypted and remain in this browser. UrbanFox has no online account or cloud database.</p></div></section>
      <section><span aria-hidden="true">2</span><div><h3>Keep an encrypted backup</h3><p>Clearing browser or app data can permanently delete everything. Create encrypted backups regularly, and keep each backup file and its separate password safe.</p></div></section>
      <section><span aria-hidden="true">3</span><div><h3>Tracking—not legal advice</h3><p>UrbanFox helps organise information and estimates. It does not guarantee ILR eligibility. Verify current GOV.UK guidance and obtain qualified advice before applying.</p></div></section>
    </div>
    <p class="first-use-guide-replay">You can replay this guide later from Profile &amp; settings.</p>`,
    actions: isFirstUse
      ? '<button class="secondary-button" type="button" data-guide-action="dismissed">Skip for now</button><button class="primary-button liquid-dialog-save" type="button" data-guide-action="completed">Continue to UrbanFox</button>'
      : '<button class="primary-button liquid-dialog-save" type="button" data-guide-close>Close guide</button>',
    dialogClass: "first-use-guide-dialog",
    closeLabel: isFirstUse ? "Skip welcome guide" : "Close welcome guide",
  });
  root.append(dialog);

  const close = (preference?: OnboardingPreference): void => {
    if (preference) saveOnboardingPreference(preference);
    dialog.close();
    dialog.remove();
    onClose?.();
  };

  dialog
    .querySelector(".dialog-close")
    ?.addEventListener("click", () =>
      close(isFirstUse ? "dismissed" : undefined),
    );
  dialog
    .querySelector("[data-guide-close]")
    ?.addEventListener("click", () => close());
  dialog
    .querySelectorAll<HTMLButtonElement>("[data-guide-action]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        close(button.dataset.guideAction as OnboardingPreference),
      ),
    );
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close(isFirstUse ? "dismissed" : undefined);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close(isFirstUse ? "dismissed" : undefined);
  });
  dialog.showModal();
}
