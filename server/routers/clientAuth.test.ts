import { describe, expect, it } from "vitest";
import { CLIENT_ADMIN_COOKIE } from "../clientAdminAuth";
import { appRouter } from "../routers";

function createContext(cookie = "") {
  const setCookies: Array<{ name: string; value: string }> = [];
  const clearedCookies: string[] = [];
  return {
    ctx: {
      req: { protocol: "http", headers: cookie ? { cookie } : {} },
      res: {
        cookie: (name: string, value: string) => setCookies.push({ name, value }),
        clearCookie: (name: string) => clearedCookies.push(name),
      },
      user: null,
    } as any,
    setCookies,
    clearedCookies,
  };
}

describe("dedicated client login", () => {
  it("accepts configured credentials, recognizes the session, and clears it on logout", async () => {
    const email = process.env.CLIENT_ADMIN_EMAIL;
    const password = process.env.CLIENT_ADMIN_PASSWORD;
    expect(email).toBeTruthy();
    expect(password).toBeTruthy();

    const login = createContext();
    const loginResult = await appRouter.createCaller(login.ctx).clientAuth.login({ email: email!, password: password! });
    const session = login.setCookies.find(cookie => cookie.name === CLIENT_ADMIN_COOKIE)?.value;
    expect(loginResult.authenticated).toBe(true);
    expect(session).toBeTruthy();

    const authenticated = createContext(`${CLIENT_ADMIN_COOKIE}=${session}`);
    expect((await appRouter.createCaller(authenticated.ctx).clientAuth.me()).authenticated).toBe(true);

    const logout = createContext(`${CLIENT_ADMIN_COOKIE}=${session}`);
    await appRouter.createCaller(logout.ctx).clientAuth.logout();
    expect(logout.clearedCookies).toContain(CLIENT_ADMIN_COOKIE);
    expect((await appRouter.createCaller(createContext().ctx).clientAuth.me()).authenticated).toBe(false);
  });
});
