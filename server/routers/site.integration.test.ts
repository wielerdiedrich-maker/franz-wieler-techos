import { afterAll, describe, expect, it } from "vitest";
import { siteRouter } from "./site";

const baseContext = { req: {} as any, res: {} as any };
const adminUser = { id: 1, openId: "integration-admin", role: "admin", name: "Integration Admin" } as any;
const admin = siteRouter.createCaller({ ...baseContext, user: adminUser } as any);
const visitor = siteRouter.createCaller({ ...baseContext, user: null } as any);
let originalHeroBadge = "";

afterAll(async () => {
  if (originalHeroBadge) {
    await admin.admin.updateContent({ updates: [{ key: "heroBadge", value: originalHeroBadge }] });
  }
});

describe("admin editor integration", () => {
  it("persists an admin content save and exposes it through the public site query", async () => {
    const initial = await visitor.public();
    originalHeroBadge = initial.content.heroBadge;
    const marker = "VALIDACIÓN ADMIN · CONTENIDO EDITABLE";

    await admin.admin.updateContent({ updates: [{ key: "heroBadge", value: marker }] });
    const refreshed = await visitor.public();
    expect(refreshed.content.heroBadge).toBe(marker);
  });

  it("accepts a valid image upload and returns a public storage path", async () => {
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==";
    const uploaded = await admin.admin.uploadImage({
      fileName: "admin-upload-check.png",
      mimeType: "image/png",
      base64: onePixelPng,
    });
    expect(uploaded.key).toContain("projects/1/");
    expect(uploaded.url).toMatch(/^\/manus-storage\//);
  });
});
