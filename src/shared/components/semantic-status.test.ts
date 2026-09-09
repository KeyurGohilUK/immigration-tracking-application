import { describe, expect, it } from "vitest";
import { renderSemanticStatus } from "./semantic-status";

describe("semantic status", () => {
  it("renders a labelled state with a decorative icon and escaped text", () => {
    const markup = renderSemanticStatus({
      label: '<script>alert("x")</script>',
      tone: "error",
    });

    expect(markup).toContain('data-status-tone="error"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(markup).not.toContain("<script>");
  });
});
