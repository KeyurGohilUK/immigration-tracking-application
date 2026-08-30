const COMPACT_SCROLL_THRESHOLD = 32;

export function initialiseScrollChrome(root: HTMLElement): () => void {
  let animationFrame = 0;

  const update = (): void => {
    animationFrame = 0;
    const hasScrolled = window.scrollY > 0;
    const useCompactNavigation = window.scrollY > COMPACT_SCROLL_THRESHOLD;
    root
      .querySelector<HTMLElement>(".top-bar")
      ?.classList.toggle("is-scrolled", hasScrolled);
    root
      .querySelector<HTMLElement>(".mobile-navigation")
      ?.classList.toggle("is-scroll-compact", useCompactNavigation);
  };

  const scheduleUpdate = (): void => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(root, { childList: true, subtree: true });
  update();

  return () => {
    window.removeEventListener("scroll", scheduleUpdate);
    observer.disconnect();
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
  };
}
