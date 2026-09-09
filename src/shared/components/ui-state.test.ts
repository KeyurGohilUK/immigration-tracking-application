import { describe, expect, it } from "vitest";
import { getUiStateSemantics, setButtonBusy } from "./ui-state";

describe("shared UI resilience states", () => {
  it("defines accessible semantics for loading, empty and corrupted-data states", () => {
    expect(getUiStateSemantics("loading")).toEqual({
      role: "status",
      ariaLive: "polite",
      ariaBusy: true,
      statusLabel: "Loading",
      tone: "info",
    });
    expect(getUiStateSemantics("empty")).toEqual({
      role: null,
      ariaLive: null,
      ariaBusy: false,
      statusLabel: "Nothing here yet",
      tone: "todo",
    });
    expect(getUiStateSemantics("error")).toEqual({
      role: "alert",
      ariaLive: null,
      ariaBusy: false,
      statusLabel: "Data problem",
      tone: "error",
    });
  });

  it("marks buttons busy and restores their original content and state", () => {
    const attributes = new Map<string, string>();
    const button = {
      disabled: false,
      innerHTML: "<span>Save trip</span>",
      textContent: "Save trip",
      setAttribute(name: string, value: string) {
        attributes.set(name, value);
      },
      removeAttribute(name: string) {
        attributes.delete(name);
      },
    } as unknown as HTMLButtonElement;

    const busy = setButtonBusy(button, "Saving trip…");

    expect(button.disabled).toBe(true);
    expect(attributes.get("aria-busy")).toBe("true");
    expect(button.textContent).toBe("Saving trip…");

    busy.restore();
    expect(button.disabled).toBe(false);
    expect(attributes.has("aria-busy")).toBe(false);
    expect(button.innerHTML).toBe("<span>Save trip</span>");
  });
});
