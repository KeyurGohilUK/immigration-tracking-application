import { renderApp } from "./app/app";
import {
  initialiseInstallPrompt,
  registerServiceWorker,
} from "./features/install/services/install-prompt";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

renderApp(root);

const installButton = document.querySelector<HTMLButtonElement>("#install-app");
if (installButton) {
  initialiseInstallPrompt(installButton);
}

registerServiceWorker();
