import { chromium } from "playwright-core";

const origin = process.env.CLIENT_PORTAL_TEST_URL || "https://3000-irjktw136h16mf2yn441l-89c7b69e.us4.manus.computer";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Client portal test credentials are unavailable.");

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 375, height: 812 } });
  await page.goto(`${origin}/admin/proyectos`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByRole("button", { name: "Usar en un proyecto" }).first().waitFor({ timeout: 15_000 });

  await page.getByRole("button", { name: "Usar en un proyecto" }).first().click();
  await page.getByText("Imagen recuperada", { exact: false }).waitFor({ timeout: 15_000 });
  await page.getByText("se añadió automáticamente a un nuevo proyecto", { exact: false }).waitFor({ timeout: 15_000 });
  await page.reload({ waitUntil: "networkidle" });
  const titles = await page.getByLabel("Título").evaluateAll(inputs => inputs.map(input => (input instanceof HTMLInputElement ? input.value : "")));
  if (!titles.includes("Proyecto recuperado")) throw new Error("Recovered image was not retained in the saved draft after reload.");
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  await page.getByText("Borrador descartado", { exact: false }).waitFor({ timeout: 15_000 });
  console.log("Recoverable Firebase image browser workflow: passed.");
} finally {
  await browser.close();
}
