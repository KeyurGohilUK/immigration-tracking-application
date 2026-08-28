import { renderApp, renderSplash } from "./app";
import { renderLandingPage } from "../features/landing/components/landing-page";

const SPLASH_DURATION_MS = 500;

export async function startApplication(root: HTMLElement): Promise<void> {
  renderSplash(root);
  await new Promise((resolve) =>
    window.setTimeout(resolve, SPLASH_DURATION_MS),
  );
  renderLandingPage(root);

  root
    .querySelector<HTMLButtonElement>("#get-started")
    ?.addEventListener("click", () => {
      renderApp(root);
    });
}
