import { deleteAllLocalData } from "../services/local-data-service";

export type DeleteDataContext = "unlocked" | "locked";

const messages = {
  unlocked: {
    eyebrow: "Permanent deletion",
    title: "Delete everything on this device?",
    guidance:
      "This deletes all encrypted UrbanFox records, the local PIN, and your Terms acceptance from this browser. It does not delete any backup files you previously downloaded.",
    warning:
      "Create an encrypted backup before continuing if you may need to restore this information.",
    button: "Permanently delete local data",
    confirmation:
      "Permanently delete all UrbanFox ILR data and the local PIN from this browser?",
  },
  locked: {
    eyebrow: "Forgotten PIN reset",
    title: "Reset this private space?",
    guidance:
      "Your PIN cannot be recovered or bypassed. Resetting deletes all encrypted UrbanFox records, the local PIN, and your Terms acceptance from this browser.",
    warning:
      "Continue only if you accept losing the local records or already have an encrypted backup and its separate password.",
    button: "Delete data and reset PIN",
    confirmation:
      "Permanently delete all UrbanFox ILR data and reset the local PIN on this browser?",
  },
} as const;

export function renderDeleteDataDialog(context: DeleteDataContext): string {
  const content = messages[context];
  return `<dialog id="delete-data-dialog" class="family-dialog" aria-labelledby="delete-data-dialog-title">
    <form id="delete-data-form" class="family-form" novalidate>
      <div class="app-manager-heading"><div><p class="eyebrow">${content.eyebrow}</p><h2 id="delete-data-dialog-title">${content.title}</h2></div><button class="dialog-close" type="button" aria-label="Close delete data form">×</button></div>
      <p id="delete-data-guidance">${content.guidance}</p>
      <p class="local-data-banner danger-warning"><strong>This cannot be undone.</strong> ${content.warning}</p>
      <label for="delete-data-confirmation">Type DELETE to confirm</label>
      <input id="delete-data-confirmation" name="confirmationPhrase" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="delete-data-guidance" required />
      <p id="delete-data-error" class="form-error" role="alert" hidden></p>
      <button id="confirm-delete-data" class="primary-button danger-button" type="submit">${content.button}</button>
    </form>
  </dialog>`;
}

interface DeleteDataDialogOptions {
  context: DeleteDataContext;
  onDeleted: () => void;
  root: HTMLElement;
  triggerSelector: string;
}

export function wireDeleteDataDialog({
  context,
  onDeleted,
  root,
  triggerSelector,
}: DeleteDataDialogOptions): void {
  const content = messages[context];
  const dialog = root.querySelector<HTMLDialogElement>("#delete-data-dialog");
  const form = root.querySelector<HTMLFormElement>("#delete-data-form");
  root
    .querySelector<HTMLButtonElement>(triggerSelector)
    ?.addEventListener("click", () => {
      form?.reset();
      const error = form?.querySelector<HTMLElement>("#delete-data-error");
      if (error) error.hidden = true;
      dialog?.showModal();
    });
  dialog
    ?.querySelector<HTMLButtonElement>(".dialog-close")
    ?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = form.querySelector<HTMLElement>("#delete-data-error");
    if (error) error.hidden = true;
    const confirmationPhrase = String(
      new FormData(form).get("confirmationPhrase") ?? "",
    ).trim();
    if (confirmationPhrase !== "DELETE") {
      if (error) {
        error.textContent = "Type DELETE exactly as shown to continue.";
        error.hidden = false;
      }
      return;
    }
    if (!window.confirm(content.confirmation)) return;
    const submit = form.querySelector<HTMLButtonElement>(
      "#confirm-delete-data",
    );
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Deleting local data…";
    }
    try {
      await deleteAllLocalData();
      dialog?.close();
      onDeleted();
    } catch {
      if (error) {
        error.textContent =
          "Local data could not be deleted. Your private space remains available.";
        error.hidden = false;
      }
      if (submit) {
        submit.disabled = false;
        submit.textContent = content.button;
      }
    }
  });
}
