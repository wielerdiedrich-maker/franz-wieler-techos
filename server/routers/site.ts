import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_PROJECTS, DEFAULT_SITE_CONTENT, type SiteContentMap } from "@shared/siteContent";
import { projects, siteContent, siteDrafts } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { publicProcedure, router } from "../_core/trpc";
import { clientAdminProcedure } from "../clientAdminProcedure";

const editableContentInput = z.object({
  key: z.string().min(1).max(64),
  value: z.string().min(1).max(4000),
});

const projectInput = z.object({
  id: z.number().int().positive().optional(),
  category: z.string().min(1).max(120),
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(1600),
  altText: z.string().min(1).max(250),
  imageUrl: z.string().min(1).max(2000),
  imageKey: z.string().max(512).nullable().optional(),
  visible: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

const draftInput = z.object({
  content: z.array(editableContentInput).min(1).max(30),
  projects: z.array(projectInput).max(100),
});

type DraftSnapshot = z.infer<typeof draftInput>;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Content database unavailable" });
  return db;
}

async function ensureInitialSiteData() {
  const db = await requireDb();
  const [contentCount] = await db.select({ id: siteContent.id }).from(siteContent).limit(1);
  if (!contentCount) {
    await db.insert(siteContent).values(
      Object.entries(DEFAULT_SITE_CONTENT).map(([contentKey, value]) => ({ contentKey, value })),
    );
  }

  const [projectCount] = await db.select({ id: projects.id }).from(projects).limit(1);
  if (!projectCount) await db.insert(projects).values(DEFAULT_PROJECTS.map(project => ({ ...project })));
  return db;
}

async function getPublishedSiteData() {
  const db = await ensureInitialSiteData();
  const contentRows = await db.select().from(siteContent);
  const projectRows = await db.select().from(projects).where(eq(projects.visible, true)).orderBy(asc(projects.sortOrder), asc(projects.id));
  const content = { ...DEFAULT_SITE_CONTENT } as SiteContentMap;
  contentRows.forEach(row => {
    if (row.contentKey in content) content[row.contentKey as keyof SiteContentMap] = row.value;
  });
  return { content, projects: projectRows };
}

async function getAdminDraftData() {
  const db = await ensureInitialSiteData();
  const published = await getPublishedSiteData();
  const allProjects = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
  const [draftRow] = await db.select().from(siteDrafts).orderBy(asc(siteDrafts.id)).limit(1);
  if (!draftRow) return { published: { ...published, projects: allProjects }, draft: null, draftUpdatedAt: null };

  try {
    const draft = draftInput.parse({ content: JSON.parse(draftRow.contentJson), projects: JSON.parse(draftRow.projectsJson) });
    return { published: { ...published, projects: allProjects }, draft, draftUpdatedAt: draftRow.updatedAt };
  } catch {
    // A malformed draft must never break the live public page or lock the admin out.
    return { published: { ...published, projects: allProjects }, draft: null, draftUpdatedAt: null };
  }
}

async function saveDraftSnapshot(draft: DraftSnapshot, userId: number) {
  const db = await ensureInitialSiteData();
  const [existing] = await db.select({ id: siteDrafts.id }).from(siteDrafts).orderBy(asc(siteDrafts.id)).limit(1);
  const values = { contentJson: JSON.stringify(draft.content), projectsJson: JSON.stringify(draft.projects), updatedBy: userId };
  if (existing) await db.update(siteDrafts).set(values).where(eq(siteDrafts.id, existing.id));
  else await db.insert(siteDrafts).values(values);
}

export const siteRouter = router({
  public: publicProcedure.query(() => getPublishedSiteData()),
  admin: router({
    dashboard: clientAdminProcedure.query(() => getAdminDraftData()),
    saveDraft: clientAdminProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
      await saveDraftSnapshot(input, ctx.clientAdmin.id);
      return { success: true } as const;
    }),
    discardDraft: clientAdminProcedure.mutation(async () => {
      const db = await ensureInitialSiteData();
      await db.delete(siteDrafts);
      return { success: true } as const;
    }),
    publishDraft: clientAdminProcedure.mutation(async ({ ctx }) => {
      const db = await ensureInitialSiteData();
      const [draftRow] = await db.select().from(siteDrafts).orderBy(asc(siteDrafts.id)).limit(1);
      if (!draftRow) throw new TRPCError({ code: "BAD_REQUEST", message: "No hay cambios en borrador para publicar." });
      const draft = draftInput.parse({ content: JSON.parse(draftRow.contentJson), projects: JSON.parse(draftRow.projectsJson) });

      await db.transaction(async tx => {
        await tx.delete(siteContent);
        await tx.insert(siteContent).values(draft.content.map(entry => ({ contentKey: entry.key, value: entry.value, updatedBy: ctx.clientAdmin.id })));
        await tx.delete(projects);
        if (draft.projects.length) {
          await tx.insert(projects).values(draft.projects.map(({ id: _id, ...project }) => ({ ...project, imageKey: project.imageKey ?? null, updatedBy: ctx.clientAdmin.id })));
        }
        await tx.delete(siteDrafts);
      });
      return { success: true } as const;
    }),
    uploadImage: clientAdminProcedure
      .input(z.object({ fileName: z.string().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(20).max(12_000_000) }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        if (buffer.byteLength > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "La imagen debe pesar menos de 8 MB." });
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        return storagePut(`projects/${ctx.clientAdmin.id}/${Date.now()}-${safeFileName}`, buffer, input.mimeType);
      }),
  }),
});
