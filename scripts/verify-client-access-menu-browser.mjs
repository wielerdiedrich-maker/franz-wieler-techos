import { chromium } from "playwright-core";

const origin = process.env.CLIENT_ACCESS_TEST_URL || "https://3000-irjktw136h16mf2yn441l-89c7b69e.us4.manus.computer";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

try {
  const desktop = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  await desktop.goto(origin, { waitUntil: "networkidle" });
  const desktopAccess = desktop.locator(".desktop-nav").getByRole("link", { name: /Acceso cliente/ });
  await desktopAccess.waitFor({ state: "visible", timeout: 15_000 });
  if (await desktopAccess.getAttribute("href") !== "/admin") throw new Error("Desktop client access link does not target /admin.");
  await desktopAccess.click();
  await desktop.getByRole("heading", { name: "Acceso cliente" }).waitFor({ timeout: 15_000 });

  const mobile = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 375, height: 812 } });
  await mobile.goto(origin, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Abrir menú" }).click();
  const mobileAccess = mobile.locator("#mobile-navigation").getByRole("link", { name: /Acceso cliente/ });
  await mobileAccess.waitFor({ state: "visible", timeout: 15_000 });
  if (await mobileAccess.getAttribute("href") !== "/admin") throw new Error("Mobile client access link does not target /admin.");
  await mobileAccess.click();
  await mobile.getByRole("heading", { name: "Acceso cliente" }).waitFor({ timeout: 15_000 });
  console.log("Client access navigation browser workflow: desktop and mobile passed.");
} finally {
  await browser.close();
}
