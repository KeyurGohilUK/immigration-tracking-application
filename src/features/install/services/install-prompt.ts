interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallController {
  canInstall(): boolean;
  prompt(): Promise<boolean>;
}

export function initialiseInstallPrompt(root: HTMLElement): InstallController {
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  function updateButton(): void {
    const button = root.querySelector<HTMLButtonElement>("#install-app");
    if (!button || button.dataset.initialised) {
      return;
    }

    button.dataset.initialised = "true";
    button.hidden = deferredPrompt === null;
    button.addEventListener("click", async () => {
      if (!deferredPrompt) {
        return;
      }

      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.hidden = true;
    });
  }

  new MutationObserver(updateButton).observe(root, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    updateButton();
    window.dispatchEvent(new Event("urbanfox-install-statechange"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const button = root.querySelector<HTMLButtonElement>("#install-app");
    if (button) {
      button.hidden = true;
    }
    window.dispatchEvent(new Event("urbanfox-install-statechange"));
  });

  return {
    canInstall: () => deferredPrompt !== null,
    prompt: async () => {
      if (!deferredPrompt) return false;
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      const button = root.querySelector<HTMLButtonElement>("#install-app");
      if (button) button.hidden = true;
      window.dispatchEvent(new Event("urbanfox-install-statechange"));
      return choice.outcome === "accepted";
    },
  };
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The application remains usable online when registration is unavailable.
    });
  });
}
