import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage SEO keywords", () => {
  it("provides six focused keywords, staying within the required 3–8 limit", () => {
    const document = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    const match = document.match(/<meta name="keywords" content="([^"]+)"\s*\/>/);
    expect(match?.[1]).toBeTruthy();
    const keywords = match![1].split(",").map(keyword => keyword.trim()).filter(Boolean);
    expect(keywords).toHaveLength(6);
    expect(keywords.length).toBeGreaterThanOrEqual(3);
    expect(keywords.length).toBeLessThanOrEqual(8);
    expect(keywords).toEqual(expect.arrayContaining(["techos en Pailón", "tinglados metálicos", "Faro Estructuras"]));
  });
});
