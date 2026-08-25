import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import { CLIENT_ADMIN_COOKIE } from "../clientAdminAuth";
import { siteRouter } from "./site";

const email = process.env.CLIENT_ADMIN_EMAIL!;
const password = process.env.CLIENT_ADMIN_PASSWORD!;
let originalSnapshot: any = null;

async function createClientAdminCaller() {
  const cookies: Array<{ name: string; value: string }> = [];
  const loginContext = {
    req: { protocol: "http", headers: {} },
    res: { cookie: (name: string, value: string) => cookies.push({ name, value }), clearCookie: () => undefined },
    user: null,
  } as any;
  await appRouter.createCaller(loginContext).clientAuth.login({ email, password });
  const session = cookies.find(cookie => cookie.name === CLIENT_ADMIN_COOKIE)?.value;
  if (!session) throw new Error("Expected client session cookie");
  return siteRouter.createCaller({ req: { headers: { cookie: `${CLIENT_ADMIN_COOKIE}=${session}` } }, res: {}, user: null } as any);
}

function snapshotFromSite(site: any) {
  return {
    content: Object.entries(site.content).map(([key, value]) => ({ key, value })),
    projects: site.projects.map((project: any) => ({ id: project.id, category: project.category, title: project.title, description: project.description, altText: project.altText, imageUrl: project.imageUrl, imageKey: project.imageKey ?? null, visible: project.visible, sortOrder: project.sortOrder })),
  };
}

afterAll(async () => {
  if (originalSnapshot) {
    const admin = await createClientAdminCaller();
    await admin.admin.saveDraft(originalSnapshot);
    await admin.admin.publishDraft();
  }
});

describe("dedicated client draft workflow", () => {
  it("keeps drafts private until the dedicated client admin explicitly publishes them", async () => {
    const admin = await createClientAdminCaller();
    const visitor = siteRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
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

  it("accepts a valid image upload from the dedicated client session", async () => {
    const admin = await createClientAdminCaller();
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==";
    const uploaded = await admin.admin.uploadImage({ fileName: "client-upload-check.png", mimeType: "image/png", base64: onePixelPng });
    expect(uploaded.key).toContain("projects/");
    expect(uploaded.url).toMatch(/^\/manus-storage\//);
  });
});
