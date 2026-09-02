import {
  APP_VERSION,
  RELEASE_NOTES,
} from "../../../configuration/release-metadata";
import { createLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import type { InstallController } from "./install-prompt";

interface ReleaseManifest {
  version: string;
  notes: string[];
}

function isNewerVersion(candidate: string, installed: string): boolean {
  const candidateParts = candidate.split(".").map(Number);
  const installedParts = installed.split(".").map(Number);
  for (const [index, part] of candidateParts.entries()) {
    const installedPart = installedParts[index] ?? 0;
    if (part === installedPart) continue;
    return part > installedPart;
  }
  return false;
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
  root: HTMLElement,
  installController: InstallController,
): void {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "app-manager-trigger";
  trigger.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4h14v-4" /></svg>`;
  trigger.setAttribute("aria-label", "Install and updates");
  trigger.title = "Install and updates";
  trigger.setAttribute("aria-haspopup", "dialog");

  const dialog = createLiquidGlassDialog({
    id: "app-manager-dialog",
    labelledBy: "app-manager-title",
    formId: "app-manager-form",
    eyebrow: "UrbanFox ILR",
    title: "Install and updates",
    subtitle:
      "Manage this device installation and keep UrbanFox ILR on the latest release.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4h14v-4"/></svg>',
    body: `<p id="release-status" class="app-manager-status">Checking latest version…</p>
      <dl class="version-list"><div><dt>Installed</dt><dd>${APP_VERSION}</dd></div><div><dt>Latest</dt><dd id="latest-version">Checking…</dd></div></dl>
      <section class="app-manager-release-notes"><h3>What’s new</h3><ul id="release-notes"></ul></section>
      <p id="install-guidance" class="storage-note"></p>
      <p id="update-message" class="form-error" role="status"></p>`,
    actions: `<button id="install-from-menu" class="secondary-button" type="button">Install app</button>
      <button id="download-update" class="primary-button liquid-dialog-save" type="button">Download updates</button>`,
    dialogClass: "app-manager-dialog",
    formClass: "app-manager-form",
    closeLabel: "Close",
  });
  document.body.append(dialog);

  const placeTrigger = (): void => {
    const header =
      root.querySelector<HTMLElement>(".header-actions") ??
      root.querySelector<HTMLElement>("header");
    if (header && trigger.parentElement !== header) header.append(trigger);
  };
  new MutationObserver(placeTrigger).observe(root, {
    childList: true,
    subtree: true,
  });
  placeTrigger();

  const close = dialog.querySelector<HTMLButtonElement>(".dialog-close");
  const install = dialog.querySelector<HTMLButtonElement>("#install-from-menu");
  const download = dialog.querySelector<HTMLButtonElement>("#download-update");
  const status = dialog.querySelector<HTMLElement>("#release-status");
  const latestVersion = dialog.querySelector<HTMLElement>("#latest-version");
  const notes = dialog.querySelector<HTMLUListElement>("#release-notes");
  const guidance = dialog.querySelector<HTMLElement>("#install-guidance");
  const message = dialog.querySelector<HTMLElement>("#update-message");
  let latestRelease: ReleaseManifest | null = null;

  const updateReleaseControls = (release: ReleaseManifest | null): void => {
    const updateAvailable = release
      ? isNewerVersion(release.version, APP_VERSION)
      : false;
    trigger.classList.toggle("is-update-available", updateAvailable);
    trigger.setAttribute(
      "aria-label",
      updateAvailable
        ? `Update ${release?.version} available`
        : "Install and updates",
    );
    trigger.title = updateAvailable
      ? `Update ${release?.version} available`
      : "Install and updates";
    if (download)
      download.textContent = updateAvailable
        ? "Download update"
        : "Check for updates";
  };

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

  const showRelease = async (): Promise<ReleaseManifest | null> => {
    updateInstallState();
    if (notes) notes.replaceChildren();
    try {
      const release = await fetchLatestRelease();
      latestRelease = release;
      updateReleaseControls(release);
      if (latestVersion) latestVersion.textContent = release.version;
      if (status)
        status.textContent = isNewerVersion(release.version, APP_VERSION)
          ? `Update ${release.version} available`
          : "All up to date";
      for (const note of release.notes) {
        const item = document.createElement("li");
        item.textContent = note;
        notes?.append(item);
      }
      return release;
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
      return null;
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
    const updateAvailable = latestRelease
      ? isNewerVersion(latestRelease.version, APP_VERSION)
      : false;
    if (!updateAvailable) {
      if (message) message.textContent = "Checking for updates…";
      const release = await showRelease();
      download.disabled = false;
      if (message)
        message.textContent =
          release && isNewerVersion(release.version, APP_VERSION)
            ? `Update ${release.version} is ready to download.`
            : release
              ? "You already have the latest version."
              : "Could not check for updates. Please try again.";
      return;
    }
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
  window.addEventListener("online", () => void showRelease());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void showRelease();
  });
  updateReleaseControls(null);
  void showRelease();
}
