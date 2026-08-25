// Browser smoke test for the public recovery UI. It uses an unknown address and an invalid token, so it sends no email or changes no password.
import { chromium } from "playwright-core";

const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
  await page.getByRole("heading", { name: "Recuperar contraseña" }).waitFor({ timeout: 15_000 });
  await page.getByLabel("Correo electrónico").fill("unknown-recovery-check@example.invalid");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByText("Si el correo corresponde a una cuenta, enviamos las instrucciones para restablecer la contraseña.", { exact: true }).waitFor({ timeout: 15_000 });

  await page.goto(`${origin}/admin/restablecer?token=${"A".repeat(43)}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Nueva contraseña" }).waitFor({ timeout: 15_000 });
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("A-new-test-password-2026");
  await page.getByLabel("Confirmar nueva contraseña", { exact: true }).fill("A-new-test-password-2026");
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
  await page.getByText("El enlace no es válido o ya venció. Solicitá uno nuevo.", { exact: true }).waitFor({ timeout: 15_000 });
  console.log("Password-recovery browser request and invalid-token protection: passed.");
} finally {
  await browser.close();
}
