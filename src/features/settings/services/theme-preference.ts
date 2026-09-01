export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "urbanfox-theme";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

let systemThemeListener: (() => void) | null = null;

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "light";
}

export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference);
  applyThemePreference(preference);
}

export function initialiseTheme(): void {
  applyThemePreference(getThemePreference());
}

function applyThemePreference(preference: ThemePreference): void {
  systemThemeListener?.();
  systemThemeListener = null;

  const media = window.matchMedia(SYSTEM_DARK_QUERY);
  const applyResolvedTheme = (): void => {
    const resolved =
      preference === "system" ? (media.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const themeColour = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColour)
      themeColour.content = resolved === "dark" ? "#1a0b2e" : "#fff7ff";
  };

  applyResolvedTheme();

  if (preference === "system") {
    const listener = (): void => applyResolvedTheme();
    media.addEventListener("change", listener);
    systemThemeListener = () => media.removeEventListener("change", listener);
  }
}
