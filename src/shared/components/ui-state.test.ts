import { describe, expect, it, vi } from "vitest";
import { createUiState, setButtonBusy } from "./ui-state";

describe("shared UI resilience states", () => {
  it("exposes loading and corrupted-data semantics without relying on colour", () => {
    const loading = createUiState({
      kind: "loading",
      title: "Opening records",
      message: "Decrypting local data.",
    });
    expect(loading.getAttribute("role")).toBe("status");
    expect(loading.getAttribute("aria-live")).toBe("polite");
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(loading.textContent).toContain("Loading");
    expect(loading.textContent).toContain("Opening records");

    const error = createUiState({
      kind: "error",
      title: "Records could not be opened",
      message: "Restore a known-good backup.",
    });
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent).toContain("Data problem");
  });

  it("creates an optional accessible recovery action", () => {
    const onAction = vi.fn();
    const state = createUiState({
      kind: "error",
      title: "Records unavailable",
      message: "Try again.",
      actionLabel: "Retry",
      onAction,
    });

    const action = state.querySelector<HTMLButtonElement>("button");
    expect(action?.type).toBe("button");
    action?.click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("marks buttons busy and restores their original content and state", () => {
    const button = document.createElement("button");
    button.innerHTML = "<span>Save trip</span>";
    const busy = setButtonBusy(button, "Saving trip…");

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent).toBe("Saving trip…");

    busy.restore();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.innerHTML).toBe("<span>Save trip</span>");
  });
});
