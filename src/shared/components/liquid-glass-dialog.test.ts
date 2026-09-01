import { describe, expect, it } from "vitest";
import { renderLiquidGlassDialog } from "./liquid-glass-dialog";

describe("renderLiquidGlassDialog", () => {
  it("renders the shared Ibiza Liquid Glass shell around feature content", () => {
    const markup = renderLiquidGlassDialog({
      id: "example-dialog",
      labelledBy: "example-title",
      formId: "example-form",
      eyebrow: "Encrypted local record",
      title: "Example",
      subtitle: "Shared modal content.",
      subtitleId: "example-subtitle",
      iconSvg: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
      body: '<label for="example-input">Name</label><input id="example-input" />',
      actions: '<button class="primary-button" type="submit">Save</button>',
      closeLabel: "Close example",
    });

    expect(markup).toContain('class="family-dialog liquid-dialog"');
    expect(markup).toContain('class="family-form liquid-dialog-form"');
    expect(markup).toContain('class="dialog-close liquid-dialog-close"');
    expect(markup).toContain('class="liquid-dialog-icon"');
    expect(markup).toContain('id="example-subtitle"');
    expect(markup).toContain('class="liquid-dialog-actions"');
    expect(markup).toContain('id="example-input"');
  });
});
