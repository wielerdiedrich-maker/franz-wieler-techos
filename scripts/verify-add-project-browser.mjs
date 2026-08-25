// Browser smoke test: add one project card, save the incomplete draft, then discard it without changing public content.
import { chromium } from "playwright-core";

const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Configured client credentials are unavailable to the browser diagnostic.");

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 375, height: 812 } });
  await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("Editor de Faro Estructuras", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Proyectos" }).click();

  const before = await page.locator("article").count();
  await page.getByRole("button", { name: "Agregar proyecto" }).click();
  await page.getByText("Proyecto agregado", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByText("Te llevamos al nuevo proyecto. Completá los datos y subí una imagen antes de publicarlo.", { exact: true }).waitFor({ timeout: 15_000 });
  const after = await page.locator("article").count();
  if (after !== before + 1) throw new Error(`Expected one new project card; found ${before} before and ${after} after.`);
  const newCard = page.locator("article").nth(after - 1);
  const newTitle = newCard.getByLabel("Título", { exact: true });
  await newTitle.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLInputElement)) return false;
    const rect = active.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }, { timeout: 15_000 });
  if (!await newTitle.evaluate(element => document.activeElement === element)) throw new Error("The new project title was not focused after adding a project.");
  const titleBox = await newTitle.boundingBox();
  if (!titleBox || titleBox.y < 0 || titleBox.y > 812) throw new Error("The new project title field was not scrolled into mobile view.");

  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.getByText("Borrador guardado. El sitio público no cambió.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  await page.getByText("Borrador descartado. Se restauró la última versión publicada.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Salir" }).click();
  console.log("Add Project browser workflow: add, save draft, discard, and logout passed.");
} finally {
  await browser.close();
}
