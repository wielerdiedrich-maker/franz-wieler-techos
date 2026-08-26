import { chromium } from "playwright-core";

const origin = process.env.PUBLIC_LOADING_TEST_URL || "https://3000-irjktw136h16mf2yn441l-89c7b69e.us4.manus.computer";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 720 }]) {
    const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport });
    await page.route("**/api/trpc/site.public**", async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue(); });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    const loading = page.locator(".site-loading-shell");
    await loading.waitFor({ timeout: 10_000 });
    const background = await loading.evaluate(element => getComputedStyle(element).backgroundColor);
    if (background !== "rgb(17, 31, 42)") throw new Error(`Expected the dark loading surface at ${viewport.width}px, received ${background}.`);
    await page.locator("#hero-title").waitFor({ timeout: 15_000 });
    await page.close();
  }
  console.log("Public loading surface browser workflow: passed.");
} finally {
  await browser.close();
}
