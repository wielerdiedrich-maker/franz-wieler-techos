import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public footer copyright", () => {
  it("uses the requested fixed 2023 copyright year", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(home).toContain("© 2023 FRANZ WIELER");
    expect(home).not.toContain("new Date().getFullYear()");
  });
});
