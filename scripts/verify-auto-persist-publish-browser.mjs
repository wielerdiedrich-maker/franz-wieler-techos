import { chromium } from "playwright-core";
import { appRouter } from "../server/routers.ts";
import { CLIENT_ADMIN_COOKIE } from "../server/clientAdminAuth.ts";
import { deleteFirebaseObject } from "../server/firebaseStorage.ts";
import { siteRouter } from "../server/routers/site.ts";

const origin = process.env.CLIENT_PORTAL_TEST_URL || "https://3000-irjktw136h16mf2yn441l-89c7b69e.us4.manus.computer";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Client portal test credentials are unavailable.");
const fileName = `auto-persist-publish-${Date.now()}.png`;
const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==", "base64");

async function createClientAdminCaller() {
  const cookies = [];
  const loginContext = { req: { protocol: "http", headers: {} }, res: { cookie: (name, value) => cookies.push({ name, value }), clearCookie: () => undefined }, user: null };
  await appRouter.createCaller(loginContext).clientAuth.login({ email, password });
  const session = cookies.find(cookie => cookie.name === CLIENT_ADMIN_COOKIE)?.value;
  if (!session) throw new Error("Client test session was not created.");
  return siteRouter.createCaller({ req: { headers: { cookie: `${CLIENT_ADMIN_COOKIE}=${session}` } }, res: {}, user: null });
}

function snapshot(site) {
  return { content: Object.entries(site.content).map(([key, value]) => ({ key, value })), projects: site.projects.map(project => ({ id: project.id, category: project.category, title: project.title, description: project.description, altText: project.altText, imageUrl: project.imageUrl, imageKey: project.imageKey ?? null, visible: project.visible, sortOrder: project.sortOrder })) };
}

const admin = await createClientAdminCaller();
const visitor = siteRouter.createCaller({ req: { headers: {} }, res: {}, user: null });
const original = snapshot(await visitor.public());
if ((await admin.admin.dashboard()).draft) throw new Error("A client draft already exists. The destructive publish verification was skipped to protect it.");

let uploadedKey = null;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 375, height: 812 } });
  await page.goto(`${origin}/admin/proyectos`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("button", { name: "Subir o reemplazar foto" }).first().waitFor({ timeout: 15_000 });
  const firstCard = page.locator("article").filter({ has: page.getByRole("button", { name: "Eliminar proyecto" }) }).first();
  await firstCard.locator('input[type="file"]').setInputFiles({ name: fileName, mimeType: "image/png", buffer: onePixelPng });
  await page.getByText("se guardó automáticamente en el borrador", { exact: false }).waitFor({ timeout: 30_000 });
  const uploadedUrl = await firstCard.locator("img").getAttribute("src");
  if (!uploadedUrl?.includes("firebasestorage.googleapis.com")) throw new Error("Auto-saved image did not render a Firebase URL.");
  uploadedKey = decodeURIComponent(new URL(uploadedUrl).pathname.split("/o/")[1] || "");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Subir o reemplazar foto" }).first().waitFor({ timeout: 15_000 });
  const reloadedUrl = await page.locator("article").filter({ has: page.getByRole("button", { name: "Eliminar proyecto" }) }).first().locator("img").getAttribute("src");
  if (reloadedUrl !== uploadedUrl) throw new Error("The auto-saved Firebase URL did not survive reload.");

  await page.getByRole("button", { name: "Vista previa", exact: true }).click();
  await page.getByRole("heading", { name: "Así se verán los cambios antes de publicar" }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Publicar cambios" }).click();
  await page.getByText("Cambios publicados en el sitio público", { exact: false }).waitFor({ timeout: 15_000 });
  if ((await visitor.public()).projects[0]?.imageUrl !== uploadedUrl) throw new Error("The reloaded auto-saved Firebase URL was not published to the public gallery.");
  console.log("Auto-saved Firebase upload reload-and-publish browser workflow: passed.");
} finally {
  await browser.close();
  await admin.admin.saveDraft(original);
  await admin.admin.publishDraft();
  if (uploadedKey) await deleteFirebaseObject(uploadedKey);
}
