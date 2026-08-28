import { startApplication } from "./app/start-application";
import {
  initialiseInstallPrompt,
  registerServiceWorker,
} from "./features/install/services/install-prompt";
import { initialiseReleaseManager } from "./features/install/services/release-manager";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

const installController = initialiseInstallPrompt(root);
initialiseReleaseManager(installController);
registerServiceWorker();
await startApplication(root);
