import { startApplication } from "./app/start-application";
import {
  initialiseInstallPrompt,
  registerServiceWorker,
} from "./features/install/services/install-prompt";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

initialiseInstallPrompt(root);
registerServiceWorker();
await startApplication(root);
