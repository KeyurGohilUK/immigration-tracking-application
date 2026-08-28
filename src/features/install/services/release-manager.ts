import {
  APP_VERSION,
  RELEASE_NOTES,
} from "../../../configuration/release-metadata";
import type { InstallController } from "./install-prompt";

interface ReleaseManifest {
  version: string;
  notes: string[];
}

function isReleaseManifest(value: unknown): value is ReleaseManifest {
  if (!value || typeof value !== "object") return false;
  const release = value as Partial<ReleaseManifest>;
  return (
    /^\d+\.\d+\.\d+$/.test(release.version ?? "") &&
    Array.isArray(release.notes) &&
    release.notes.every((note) => typeof note === "string")
  );
}

async function fetchLatestRelease(): Promise<ReleaseManifest> {
  const response = await fetch(`./release.json?check=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Latest release could not be checked.");
  const value: unknown = await response.json();
  if (!isReleaseManifest(value))
    throw new Error("Latest release information is invalid.");
  return value;
}

async function clearApplicationCaches(): Promise<void> {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("urbanfox-shell"))
        .map((key) => caches.delete(key)),
    );
  }
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }
}

export function initialiseReleaseManager(
  installController: InstallController,
): void {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "app-manager-trigger";
  trigger.textContent = "App & updates";
  trigger.setAttribute("aria-haspopup", "dialog");

  const dialog = document.createElement("dialog");
  dialog.className = "app-manager-dialog";
  dialog.setAttribute("aria-labelledby", "app-manager-title");
  dialog.innerHTML = `<div class="app-manager-heading"><div><p class="eyebrow">UrbanFox ILR</p><h2 id="app-manager-title">Install and updates</h2></div><button class="dialog-close" type="button" aria-label="Close">×</button></div><p id="release-status">Checking latest version…</p><dl class="version-list"><div><dt>Installed</dt><dd>${APP_VERSION}</dd></div><div><dt>Latest</dt><dd id="latest-version">Checking…</dd></div></dl><section><h3>What’s new</h3><ul id="release-notes"></ul></section><div class="app-manager-actions"><button id="install-from-menu" class="secondary-button" type="button">Install app</button><p id="install-guidance" class="storage-note"></p><button id="download-update" class="primary-button" type="button">Download updates</button></div><p id="update-message" class="form-error" role="status"></p>`;
  document.body.append(trigger, dialog);

  const close = dialog.querySelector<HTMLButtonElement>(".dialog-close");
  const install = dialog.querySelector<HTMLButtonElement>("#install-from-menu");
  const download = dialog.querySelector<HTMLButtonElement>("#download-update");
  const status = dialog.querySelector<HTMLElement>("#release-status");
  const latestVersion = dialog.querySelector<HTMLElement>("#latest-version");
  const notes = dialog.querySelector<HTMLUListElement>("#release-notes");
  const guidance = dialog.querySelector<HTMLElement>("#install-guidance");
  const message = dialog.querySelector<HTMLElement>("#update-message");

  const updateInstallState = (): void => {
    if (!install || !guidance) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    install.disabled = standalone || !installController.canInstall();
    install.textContent = standalone ? "App installed" : "Install app";
    guidance.textContent = standalone
      ? "UrbanFox ILR is installed on this device."
      : installController.canInstall()
        ? "Chrome is ready to install the app."
        : "If installation is supported, use Chrome’s Install app option after eligibility is detected.";
  };

  const showRelease = async (): Promise<void> => {
    updateInstallState();
    if (notes) notes.replaceChildren();
    try {
      const release = await fetchLatestRelease();
      if (latestVersion) latestVersion.textContent = release.version;
      if (status)
        status.textContent =
          release.version === APP_VERSION
            ? "All up to date"
            : `Update ${release.version} available`;
      for (const note of release.notes) {
        const item = document.createElement("li");
        item.textContent = note;
        notes?.append(item);
      }
    } catch {
      if (latestVersion) latestVersion.textContent = "Unavailable";
      if (status)
        status.textContent =
          "Could not check for updates. You can retry safely.";
      for (const note of RELEASE_NOTES) {
        const item = document.createElement("li");
        item.textContent = note;
        notes?.append(item);
      }
    }
  };

  trigger.addEventListener("click", () => {
    dialog.showModal();
    void showRelease();
  });
  close?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  install?.addEventListener("click", async () => {
    await installController.prompt();
    updateInstallState();
  });
  download?.addEventListener("click", async () => {
    download.disabled = true;
    if (message)
      message.textContent =
        "Downloading the latest app files… Your local records will be preserved.";
    try {
      await clearApplicationCaches();
      window.location.reload();
    } catch {
      download.disabled = false;
      if (message)
        message.textContent =
          "Update could not be downloaded. Your data is safe; please try again.";
    }
  });
  window.addEventListener("urbanfox-install-statechange", updateInstallState);
}
