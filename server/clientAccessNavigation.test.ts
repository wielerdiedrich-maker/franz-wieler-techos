import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("public client portal navigation", () => {
  it("renders an Acceso cliente link to the standalone portal in both navigation menus", () => {
    expect(homeSource.match(/href="\/admin"/g)).toHaveLength(3);
    expect(homeSource).toContain('className="client-access-nav"');
    expect(homeSource).toContain('className="mobile-client-access"');
  });

  it("keeps the menu entry visible and visually emphasized at mobile widths", () => {
    expect(styles).toContain(".desktop-nav .client-access-nav");
    expect(styles).toContain(".mobile-client-access");
    expect(styles).toContain(".mobile-nav-open { max-height: 420px;");
  });
});
