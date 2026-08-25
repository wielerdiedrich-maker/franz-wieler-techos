import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_PROJECTS, DEFAULT_SITE_CONTENT, type SiteContentMap } from "@shared/siteContent";
import { projects, siteContent } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

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
  if (!projectCount) {
    await db.insert(projects).values(DEFAULT_PROJECTS.map(project => ({ ...project })));
  }
  return db;
}

async function getSiteData(includeHidden: boolean) {
  const db = await ensureInitialSiteData();
  const contentRows = await db.select().from(siteContent);
  const projectRows = await db
    .select()
    .from(projects)
    .where(includeHidden ? undefined : eq(projects.visible, true))
    .orderBy(asc(projects.sortOrder), asc(projects.id));

  const content = { ...DEFAULT_SITE_CONTENT } as SiteContentMap;
  contentRows.forEach(row => {
    if (row.contentKey in content) {
      content[row.contentKey as keyof SiteContentMap] = row.value;
    }
  });
  return { content, projects: projectRows };
}

export const siteRouter = router({
  public: publicProcedure.query(() => getSiteData(false)),
  admin: router({
    dashboard: adminProcedure.query(() => getSiteData(true)),
    updateContent: adminProcedure
      .input(z.object({ updates: z.array(editableContentInput).min(1).max(24) }))
      .mutation(async ({ ctx, input }) => {
        const db = await ensureInitialSiteData();
        for (const update of input.updates) {
          const existing = await db
            .select({ id: siteContent.id })
            .from(siteContent)
            .where(eq(siteContent.contentKey, update.key))
            .limit(1);
          if (existing[0]) {
            await db
              .update(siteContent)
              .set({ value: update.value, updatedBy: ctx.user.id })
              .where(eq(siteContent.id, existing[0].id));
          } else {
            await db.insert(siteContent).values({
              contentKey: update.key,
              value: update.value,
              updatedBy: ctx.user.id,
            });
          }
        }
        return { success: true } as const;
      }),
    saveProject: adminProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
      const db = await ensureInitialSiteData();
      const values = { ...input, imageKey: input.imageKey ?? null, updatedBy: ctx.user.id };
      if (input.id) {
        await db.update(projects).set(values).where(eq(projects.id, input.id));
        return { id: input.id };
      }
      const result = await db.insert(projects).values(values);
      return { id: Number(result[0].insertId) };
    }),
    deleteProject: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await ensureInitialSiteData();
        await db.delete(projects).where(eq(projects.id, input.id));
        return { success: true } as const;
      }),
    reorderProjects: adminProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const db = await ensureInitialSiteData();
        for (let sortOrder = 0; sortOrder < input.ids.length; sortOrder += 1) {
          const id = input.ids[sortOrder];
          await db.update(projects).set({ sortOrder, updatedBy: ctx.user.id }).where(eq(projects.id, id));
        }
        return { success: true } as const;
      }),
    uploadImage: adminProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(180),
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          base64: z.string().min(20).max(12_000_000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        if (buffer.byteLength > 8 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "La imagen debe pesar menos de 8 MB." });
        }
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploaded = await storagePut(`projects/${ctx.user.id}/${Date.now()}-${safeFileName}`, buffer, input.mimeType);
        return uploaded;
      }),
  }),
});
