// End-to-end browser diagnostic: create a Firebase-backed project, preview and publish it, confirm public rendering, then restore the gallery.
import { chromium } from "playwright-core";
import { deleteFirebaseObject } from "../server/firebaseStorage.ts";

const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Configured client credentials are unavailable to the browser diagnostic.");

const title = "Proyecto nuevo de prueba automatizada";
const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==", "base64");
let uploadedKey = null;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("Editor de Faro Estructuras", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Proyectos" }).click();

  const initialCount = await page.locator("article").count();
  await page.getByRole("button", { name: "Agregar proyecto" }).click();
  const newCard = page.locator("article").nth(initialCount);
  await newCard.getByLabel("Categoría", { exact: true }).fill("Proyecto de prueba");
  await newCard.getByLabel("Título", { exact: true }).fill(title);
  await newCard.getByLabel("Descripción estructural", { exact: true }).fill("Proyecto temporal para validar el flujo de publicación de un nuevo trabajo.");
  await newCard.getByLabel("Texto alternativo", { exact: true }).fill("Proyecto temporal de Faro Estructuras");
  await newCard.locator('input[type="file"]').setInputFiles({ name: "new-project-browser-check.png", mimeType: "image/png", buffer: onePixelPng });
  await newCard.getByText(/se guardó en Firebase/).waitFor({ timeout: 20_000 });
  const uploadedSrc = await newCard.locator("img").getAttribute("src");
  uploadedKey = decodeURIComponent(new URL(uploadedSrc || "").pathname.split("/o/")[1] || "");
  if (!uploadedKey) throw new Error("Could not determine the temporary Firebase object key.");

  await page.getByRole("button", { name: "Guardar y ver vista previa" }).click();
  await page.getByText("Vista previa privada", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByText(title, { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Publicar cambios" }).click();
  await page.getByText("Cambios publicados en el sitio público.", { exact: true }).waitFor({ timeout: 20_000 });

  const publicPage = await context.newPage();
  await publicPage.goto(`${origin}/`, { waitUntil: "networkidle" });
  await publicPage.getByText(title, { exact: true }).waitFor({ timeout: 15_000 });
  await publicPage.close();

  // Restore the exact previous gallery by removing this temporary card, then publishing the restored draft.
  await page.goto(`${origin}/admin/proyectos`, { waitUntil: "networkidle" });
  const projectIndex = await page.locator('input[aria-label="Título"]').evaluateAll((inputs, expectedTitle) => inputs.findIndex(input => input.value === expectedTitle), title);
  if (projectIndex < 0) throw new Error("Could not find the temporary project card to restore the gallery.");
  const restoredCard = page.locator("article").nth(projectIndex);
  await restoredCard.getByRole("button", { name: "Quitar del borrador" }).click();
  await page.getByRole("button", { name: "Guardar y ver vista previa" }).click();
  await page.getByText("Vista previa privada", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Publicar cambios" }).click();
  await page.getByText("Cambios publicados en el sitio público.", { exact: true }).waitFor({ timeout: 20_000 });

  const restoredPublic = await context.newPage();
  await restoredPublic.goto(`${origin}/`, { waitUntil: "networkidle" });
  if (await restoredPublic.getByText(title, { exact: true }).count()) throw new Error("Temporary project remained in the public gallery after restoration.");
  await restoredPublic.close();
  console.log("Add Project browser publish workflow: passed and public gallery restored.");
} finally {
  await browser.close();
  if (uploadedKey) await deleteFirebaseObject(uploadedKey);
}
