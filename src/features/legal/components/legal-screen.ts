import { APP_NAME } from "../../../configuration/app-metadata";
import { CURRENT_TERMS_VERSION } from "../../../configuration/legal-metadata";

export function renderLegalScreen(
  root: HTMLElement,
  acceptanceRequired: boolean,
): void {
  root.innerHTML = `
    <div class="legal-shell">
      <header class="public-header"><span class="wordmark"><span class="wordmark-mark" aria-hidden="true">UF</span><span>${APP_NAME}</span></span></header>
      <main class="legal-main">
        <header class="legal-heading">
          <p class="eyebrow">Please read carefully</p>
          <h1>Terms and privacy</h1>
          <p>Version ${CURRENT_TERMS_VERSION}. UrbanFox ILR is provided by Keyur Gohil as an individual.</p>
        </header>
        <nav class="legal-navigation" aria-label="Legal information">
          <a href="#terms">Terms</a><a href="#privacy">Privacy</a><a href="#about">About</a><a href="#licence">Licence</a>
        </nav>
        ${acceptanceRequired ? `<form id="terms-form" class="terms-form"><label><input name="acceptTerms" type="checkbox" required /> <span>I have read and accept the Terms, Privacy notice, and tracking-only disclaimer.</span></label><button class="primary-button" type="submit">Accept and continue</button></form>` : `<button id="legal-back" class="secondary-button legal-back" type="button">Back</button>`}
        <article class="legal-content">
          <section id="terms"><h2>Terms and conditions</h2>
            <p>UrbanFox ILR is a tracking and organisational tool only. It does not provide legal or immigration advice, determine eligibility, guarantee an outcome, or replace current GOV.UK guidance or advice from a qualified professional.</p>
            <p>You remain responsible for checking rules, evidence, dates, calculations, backups, and every immigration application. The app is not affiliated with or endorsed by the UK Government, Home Office, or UK Visas and Immigration.</p>
            <p>The software and results are provided “as is” without guarantees of accuracy, availability, fitness for purpose, or uninterrupted operation. To the fullest extent permitted by law, Keyur Gohil is not liable for application refusal, missed deadlines, lost data, reliance on estimates, or indirect loss arising from use of the app. Nothing excludes liability that cannot legally be excluded.</p>
          </section>
          <section id="privacy"><h2>Privacy and local data</h2>
            <p>The app uses no online account or application database. Information is stored locally in your browser. Clearing browser data, uninstalling the app, losing the device, or forgetting the PIN may permanently remove access.</p>
            <p>No analytics or advertising trackers are included. Profile records and uploaded document files are encrypted and stored locally in this browser. Current JSON backups do not include document files. You are responsible for retaining originals and storing downloaded backups securely.</p>
          </section>
          <section id="about"><h2>About</h2><p>Freddy the Urban Fox guides users through ${APP_NAME}, but Freddy’s guidance is not legal advice. Always verify information using official sources.</p></section>
          <section id="licence"><h2>Licence</h2><p>Copyright © 2026 Keyur Gohil. All rights reserved. Public repository visibility does not grant permission to use, copy, modify, redistribute, republish, fork, clone, or independently deploy the software. See the repository LICENSE for the complete notice.</p></section>
        </article>
      </main>
    </div>`;
}
