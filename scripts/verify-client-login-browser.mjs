// Browser smoke test: validates the public /admin form, protected portal, and logout without printing credentials.
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
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByText("Acceso cliente", { exact: true }).waitFor({ timeout: 15_000 });
  console.log("Browser client login, protected portal, and logout: passed.");
} finally {
  await browser.close();
}
