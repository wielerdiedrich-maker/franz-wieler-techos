import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import { CLIENT_ADMIN_COOKIE } from "../clientAdminAuth";
import { deleteFirebaseObject } from "../firebaseStorage";
import { siteRouter } from "./site";

const email = process.env.CLIENT_ADMIN_EMAIL!;
const password = process.env.CLIENT_ADMIN_PASSWORD!;

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

describe.sequential("dedicated client draft workflow", () => {
  it("keeps drafts private until the dedicated client admin explicitly publishes them", async () => {
    const admin = await createClientAdminCaller();
    const visitor = siteRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
    const initial = await visitor.public();
    const originalSnapshot = snapshotFromSite(initial);
    const marker = "VALIDACIÓN BORRADOR · AÚN NO PUBLICADO";
    const draft = snapshotFromSite(initial);
    draft.content = draft.content.map((entry: any) => entry.key === "heroBadge" ? { ...entry, value: marker } : entry);
    try {
      await admin.admin.saveDraft(draft);
      expect((await visitor.public()).content.heroBadge).toBe(initial.content.heroBadge);
      expect((await admin.admin.dashboard()).draft?.content.find(entry => entry.key === "heroBadge")?.value).toBe(marker);
      await admin.admin.publishDraft();
      expect((await visitor.public()).content.heroBadge).toBe(marker);
    } finally {
      await admin.admin.saveDraft(originalSnapshot);
      await admin.admin.publishDraft();
    }
  }, 30_000);

  it("accepts a valid image upload from the dedicated client session", async () => {
    const admin = await createClientAdminCaller();
    const visitor = siteRouter.createCaller({ req: { headers: {} }, res: {}, user: null } as any);
    const initial = await visitor.public();
    const originalSnapshot = snapshotFromSite(initial);
    const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==";
    const uploaded = await admin.admin.uploadImage({ fileName: "client-upload-check.png", mimeType: "image/png", base64: onePixelPng });
    try {
      expect(uploaded.key).toContain("projects/");
      expect(uploaded.url).toMatch(/^https:\/\/firebasestorage\.googleapis\.com\//);
      expect((await fetch(uploaded.url)).ok).toBe(true);

      const draft = snapshotFromSite(initial);
      draft.projects[0] = { ...draft.projects[0], imageUrl: uploaded.url, imageKey: uploaded.key };
      await admin.admin.saveDraft(draft);
      expect((await admin.admin.dashboard()).draft?.projects[0]?.imageUrl).toBe(uploaded.url);
      expect((await visitor.public()).projects[0]?.imageUrl).toBe(initial.projects[0]?.imageUrl);

      await admin.admin.publishDraft();
      expect((await visitor.public()).projects[0]?.imageUrl).toBe(uploaded.url);
      expect((await fetch(uploaded.url)).ok).toBe(true);
    } finally {
      await admin.admin.saveDraft(originalSnapshot);
      await admin.admin.publishDraft();
      await deleteFirebaseObject(uploaded.key);
    }
  }, 30_000);
});
