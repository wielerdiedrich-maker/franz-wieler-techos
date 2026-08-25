import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONTENT } from "@shared/siteContent";
import { siteRouter } from "./site";

const baseContext = { req: { headers: {} } as any, res: {} as any };

describe("site client portal security", () => {
  it("denies dashboard access when no dedicated client session is present", async () => {
    const caller = siteRouter.createCaller({ ...baseContext, user: null } as any);
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("denies draft writes when no dedicated client session is present", async () => {
    const caller = siteRouter.createCaller({ ...baseContext, user: null } as any);
    await expect(caller.admin.saveDraft({ content: [{ key: "heroTitle", value: "Cambio no permitido" }], projects: [] })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("editable content defaults", () => {
  it("includes the core public contact and trust fields", () => {
    expect(DEFAULT_SITE_CONTENT.phoneNumber).toBe("+591 635 44951");
    expect(DEFAULT_SITE_CONTENT.experienceText).toContain("Pailón");
    expect(DEFAULT_SITE_CONTENT.heroTitle).toBeTruthy();
  });
});
