import { APP_NAME } from "../../../configuration/app-metadata";

export function renderLandingPage(root: HTMLElement): void {
  root.innerHTML = `
    <div class="public-shell">
      <header class="public-header">
        <a class="wordmark" href="#" aria-label="${APP_NAME} home">
          <img class="wordmark-logo" src="./brand-logo.png" alt="" />
          <span>${APP_NAME}</span>
        </a>
      </header>

      <main class="landing-main">
        <section class="landing-hero" aria-labelledby="landing-title">
          <div class="landing-copy">
            <p class="eyebrow">Private immigration tracking</p>
            <h1 id="landing-title">Keep your ILR journey organised.</h1>
            <p class="landing-introduction">
              Freddy the Urban Fox helps you track family details, immigration history, and trips.
              Your information stays locally on this device.
            </p>
            <p id="landing-status" class="landing-status" role="status" hidden></p>
            <button id="get-started" class="primary-button landing-action" type="button">
              Get started
            </button>
            <small class="storage-note">No online account or database is used.</small>
          </div>

          <div class="freddy-hero" aria-label="Freddy the Urban Fox">
            <img class="freddy-hero-logo" src="./brand-logo.png" alt="" />
            <p>Hi, I’m Freddy. I’ll help you keep track.</p>
          </div>
        </section>

        <aside class="notice landing-notice" aria-labelledby="landing-notice-title">
          <span class="notice-icon" aria-hidden="true">i</span>
          <div>
            <h2 id="landing-notice-title">A tracking tool—not legal advice</h2>
            <p>
              Always verify current GOV.UK guidance and obtain qualified legal advice before
              making an immigration application.
            </p>
          </div>
        </aside>
      </main>
      <footer class="public-footer" aria-label="Legal links">
        <button type="button" data-legal-view>Terms</button><button type="button" data-legal-view>Privacy</button><button type="button" data-legal-view>About</button><button type="button" data-legal-view>Licence</button>
      </footer>
    </div>
  `;
}
