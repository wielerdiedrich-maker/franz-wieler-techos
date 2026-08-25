// Browser smoke test: add one project card, save the incomplete draft, then discard it without changing public content.
import { chromium } from "playwright-core";

const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Configured client credentials are unavailable to the browser diagnostic.");

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("Editor de Faro Estructuras", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Proyectos" }).click();

  const before = await page.locator("article").count();
  await page.getByRole("button", { name: "Agregar proyecto" }).click();
  await page.getByText("Nuevo proyecto agregado. Completá los datos y subí una imagen antes de publicarlo.", { exact: true }).waitFor({ timeout: 15_000 });
  const after = await page.locator("article").count();
  if (after !== before + 1) throw new Error(`Expected one new project card; found ${before} before and ${after} after.`);

  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.getByText("Borrador guardado. El sitio público no cambió.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  await page.getByText("Borrador descartado. Se restauró la última versión publicada.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Salir" }).click();
  console.log("Add Project browser workflow: add, save draft, discard, and logout passed.");
} finally {
  await browser.close();
}
