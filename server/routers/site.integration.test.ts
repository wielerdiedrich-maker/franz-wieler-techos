import { afterAll, describe, expect, it } from "vitest";
import { siteRouter } from "./site";

const baseContext = { req: {} as any, res: {} as any };
const adminUser = { id: 1, openId: "integration-admin", role: "admin", name: "Integration Admin" } as any;
const admin = siteRouter.createCaller({ ...baseContext, user: adminUser } as any);
const visitor = siteRouter.createCaller({ ...baseContext, user: null } as any);
let originalSnapshot: any = null;

function snapshotFromSite(site: any) {
  return {
    content: Object.entries(site.content).map(([key, value]) => ({ key, value })),
    projects: site.projects.map((project: any) => ({
      id: project.id,
      category: project.category,
      title: project.title,
      description: project.description,
      altText: project.altText,
      imageUrl: project.imageUrl,
      imageKey: project.imageKey ?? null,
      visible: project.visible,
      sortOrder: project.sortOrder,
    })),
  };
}

afterAll(async () => {
  if (originalSnapshot) {
    await admin.admin.saveDraft(originalSnapshot);
    await admin.admin.publishDraft();
  }
});

describe("admin editor draft workflow", () => {
  it("keeps draft edits private until an administrator explicitly publishes them", async () => {
    const initial = await visitor.public();
    originalSnapshot = snapshotFromSite(initial);
    const marker = "VALIDACIÓN BORRADOR · AÚN NO PUBLICADO";
    const draft = snapshotFromSite(initial);
    draft.content = draft.content.map((entry: any) => entry.key === "heroBadge" ? { ...entry, value: marker } : entry);

    await admin.admin.saveDraft(draft);
    expect((await visitor.public()).content.heroBadge).toBe(initial.content.heroBadge);
    expect((await admin.admin.dashboard()).draft?.content.find(entry => entry.key === "heroBadge")?.value).toBe(marker);

    await admin.admin.publishDraft();
    expect((await visitor.public()).content.heroBadge).toBe(marker);
  });

  it("accepts a valid image upload and returns a public storage path", async () => {
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==";
    const uploaded = await admin.admin.uploadImage({ fileName: "admin-upload-check.png", mimeType: "image/png", base64: onePixelPng });
    expect(uploaded.key).toContain("projects/1/");
    expect(uploaded.url).toMatch(/^\/manus-storage\//);
  });
});
