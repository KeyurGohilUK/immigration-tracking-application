interface ProgressMetric {
  label: string;
  value: string;
  description: string;
}

interface ProgressCardOptions {
  id: string;
  headingLevel: 1 | 2;
  kicker: string;
  title: string;
  subtitle: string;
  status: string;
  requiresReview: boolean;
  progressLabel: string;
  progressAccessibleName: string;
  progressPercent: number;
  metrics: readonly ProgressMetric[];
}

export function createProgressCard(options: ProgressCardOptions): HTMLElement {
  const card = document.createElement("section");
  card.className = "progress-card glass-panel-floating";
  card.setAttribute("aria-labelledby", `${options.id}-title`);
  card.innerHTML = `<div class="progress-card-edge" aria-hidden="true"></div><div class="progress-card-heading"><div><span class="progress-card-kicker"></span><h${options.headingLevel} id="${options.id}-title"></h${options.headingLevel}><p></p></div><span class="progress-card-status"><i aria-hidden="true"></i><span></span></span></div><div class="progress-card-summary"><div><span></span><strong></strong></div><div class="progress-card-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div></div><div class="progress-card-metrics"></div>`;
  card.querySelector(".progress-card-kicker")!.textContent = options.kicker;
  card.querySelector("h1, h2")!.textContent = options.title;
  card.querySelector("p")!.textContent = options.subtitle;
  const status = card.querySelector(".progress-card-status")!;
  status.classList.toggle("requires-review", options.requiresReview);
  status.querySelector("span")!.textContent = options.status;
  const percent = Number.isFinite(options.progressPercent)
    ? Math.max(0, Math.min(100, options.progressPercent))
    : 0;
  card.querySelector(".progress-card-summary > div > span")!.textContent =
    options.progressLabel;
  card.querySelector(".progress-card-summary strong")!.textContent =
    `${Math.round(percent)}% complete`;
  const track = card.querySelector<HTMLElement>(".progress-card-track")!;
  track.setAttribute("aria-label", options.progressAccessibleName);
  track.setAttribute("aria-valuenow", String(Math.round(percent)));
  track.style.setProperty("--progress-percent", `${percent}%`);
  const metrics = card.querySelector(".progress-card-metrics")!;
  for (const metric of options.metrics) {
    const tile = document.createElement("div");
    tile.innerHTML = "<span></span><strong></strong><small></small>";
    tile.querySelector("span")!.textContent = metric.label;
    tile.querySelector("strong")!.textContent = metric.value;
    tile.querySelector("small")!.textContent = metric.description;
    metrics.append(tile);
  }
  return card;
}
