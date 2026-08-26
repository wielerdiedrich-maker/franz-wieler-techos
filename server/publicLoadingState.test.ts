import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public managed-content loading state", () => {
  it("shows an explicit branded loading surface while the site content query is pending", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(home).toContain("if (managedSite.isPending) return <PublicSiteLoading />;");
    expect(home).toContain('className="site-loading-shell"');
  });
});
