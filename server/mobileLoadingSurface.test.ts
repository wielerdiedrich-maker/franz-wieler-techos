import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile public section transition", () => {
  it("keeps the proof section close to the preceding services section instead of resembling a blank loading area", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(css).toContain(".proof-section { width: min(100% - 40px, 650px); padding: 40px 0 78px; position: relative; }");
    expect(css).toContain(".proof-section::before { content: \"\"; position: absolute; top: 0; left: 0; width: 44px; height: 3px; background: var(--orange); }");
  });

  it("defines an intentional dark surface for the public site loading state", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(css).toContain(".site-loading-shell { min-height: 100svh; display: grid; place-items: center; padding: 32px; background: var(--ink); color: var(--bone); }");
  });
});
