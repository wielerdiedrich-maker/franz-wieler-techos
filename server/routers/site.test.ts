import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_CONTENT } from "@shared/siteContent";
import { siteRouter } from "./site";

const baseContext = {
  req: {} as any,
  res: {} as any,
};

describe("site admin editor security", () => {
  it("denies dashboard access to visitors who are not signed in", async () => {
    const caller = siteRouter.createCaller({ ...baseContext, user: null } as any);
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies write access to authenticated users without the admin role", async () => {
    const caller = siteRouter.createCaller({
      ...baseContext,
      user: { id: 7, role: "user", openId: "client-user" },
    } as any);
    await expect(caller.admin.saveDraft({ content: [{ key: "heroTitle", value: "Cambio no permitido" }], projects: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("editable content defaults", () => {
  it("includes the core public contact and trust fields", () => {
    expect(DEFAULT_SITE_CONTENT.phoneNumber).toBe("+591 635 44951");
    expect(DEFAULT_SITE_CONTENT.experienceText).toContain("Pailón");
    expect(DEFAULT_SITE_CONTENT.heroTitle).toBeTruthy();
  });
});
