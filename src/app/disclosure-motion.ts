const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const OPEN_DURATION_MS = 320;
const CLOSE_DURATION_MS = 260;
const DISCLOSURE_ANIMATION_ID = "urbanfox-disclosure";
const DISCLOSURE_CONTENT_ANIMATION_ID = "urbanfox-disclosure-content";

function isDirectSummary(
  details: HTMLDetailsElement,
  summary: Element,
): summary is HTMLElement {
  return summary.matches("summary") && summary.parentElement === details;
}

function measureCollapsedHeight(details: HTMLDetailsElement): number {
  const wasOpen = details.open;
  const inlineHeight = details.style.height;

  details.style.height = "";
  details.open = false;
  const collapsedHeight = details.getBoundingClientRect().height;
  details.open = wasOpen;
  details.style.height = inlineHeight;

  return collapsedHeight;
}

function animateDisclosure(
  details: HTMLDetailsElement,
  shouldOpen: boolean,
): void {
  if (typeof details.animate !== "function") {
    details.open = shouldOpen;
    return;
  }

  const startHeight = details.getBoundingClientRect().height;
  const endHeight = shouldOpen
    ? (() => {
        details.open = true;
        return details.getBoundingClientRect().height;
      })()
    : measureCollapsedHeight(details);

  if (!shouldOpen) details.open = true;

  details.dataset.disclosureAnimating = "true";
  details.style.height = `${startHeight}px`;
  details.style.overflow = "clip";

  const duration = shouldOpen ? OPEN_DURATION_MS : CLOSE_DURATION_MS;
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
  const animation = details.animate(
    [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
    { duration, easing },
  );
  animation.id = DISCLOSURE_ANIMATION_ID;

  const contentAnimations = Array.from(details.children)
    .filter((child) => !child.matches("summary"))
    .map((child) => {
      const contentAnimation = child.animate(
        shouldOpen
          ? [
              { opacity: 0.55, transform: "translateY(-0.3rem)" },
              { opacity: 1, transform: "translateY(0)" },
            ]
          : [
              { opacity: 1, transform: "translateY(0)" },
              { opacity: 0.45, transform: "translateY(-0.2rem)" },
            ],
        { duration, easing, fill: "both" },
      );
      contentAnimation.id = DISCLOSURE_CONTENT_ANIMATION_ID;
      return contentAnimation;
    });

  void animation.finished
    .catch(() => undefined)
    .then(() => {
      details.open = shouldOpen;
      details.style.removeProperty("height");
      details.style.removeProperty("overflow");
      delete details.dataset.disclosureAnimating;
      contentAnimations.forEach((contentAnimation) =>
        contentAnimation.cancel(),
      );
    });
}

export function initialiseDisclosureMotion(root: HTMLElement): void {
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const summary = target.closest("summary");
    const details = summary?.parentElement;
    if (
      !(details instanceof HTMLDetailsElement) ||
      !summary ||
      !isDirectSummary(details, summary)
    )
      return;

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    if (details.dataset.disclosureAnimating === "true") {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    animateDisclosure(details, !details.open);
  });
}
