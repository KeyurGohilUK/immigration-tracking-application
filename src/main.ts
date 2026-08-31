import { startApplication } from "./app/start-application";
import { initialiseScrollChrome } from "./app/scroll-chrome";
import {
  initialiseInstallPrompt,
  registerServiceWorker,
} from "./features/install/services/install-prompt";
import { initialiseReleaseManager } from "./features/install/services/release-manager";
import { initialiseTheme } from "./features/settings/services/theme-preference";
import "./styles.css";

initialiseTheme();

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

const installController = initialiseInstallPrompt(root);
initialiseReleaseManager(root, installController);
initialiseScrollChrome(root);
registerServiceWorker();
await startApplication(root);
