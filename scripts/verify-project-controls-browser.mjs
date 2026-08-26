// Browser smoke test: edit an existing project, confirm a guarded deletion, save the draft, then discard it safely.
import { chromium } from "playwright-core";

const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Configured client credentials are unavailable to the browser diagnostic.");

const editedTitle = "Edición temporal de proyecto";
const viewport = process.env.PROJECT_CONTROLS_VIEWPORT === "desktop" ? { width: 1280, height: 720 } : { width: 375, height: 812 };
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport });
  await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("button", { name: "Proyectos" }).click();

  const cards = page.locator("article");
  await cards.first().waitFor({ state: "visible", timeout: 15_000 });
  const initialCount = await cards.count();
  const firstCard = cards.first();
  await firstCard.getByRole("button", { name: "Editar proyecto" }).click();
  await page.getByText("Proyecto listo para editar", { exact: true }).waitFor({ timeout: 15_000 });
  await firstCard.getByLabel("Título", { exact: true }).fill(editedTitle);
  await page.getByRole("button", { name: "Guardar y ver vista previa" }).click();
  await page.getByText("Vista previa privada", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByText(editedTitle, { exact: true }).waitFor({ timeout: 15_000 });

  await page.goto(`${origin}/admin/proyectos`, { waitUntil: "networkidle" });
  await page.evaluate(() => { window.confirm = () => true; });
  await page.locator("article").last().getByRole("button", { name: "Eliminar proyecto" }).click();
  await page.waitForFunction(expectedCount => document.querySelectorAll("article").length === expectedCount, initialCount - 1, { timeout: 15_000 });
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.getByText("Borrador guardado. El sitio público no cambió.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  await page.getByText("Borrador descartado. Se restauró la última versión publicada.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Salir" }).click();
  console.log("Direct project edit and guarded deletion browser workflow: passed.");
} finally {
  await browser.close();
}
