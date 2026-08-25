// Non-destructive browser check: upload to Firebase, verify private draft preview, then discard the draft.
import { chromium } from "playwright-core";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const origin = process.env.CLIENT_LOGIN_TEST_URL || "https://franztechos-92lju5en.manus.space";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Configured client credentials are unavailable to the browser diagnostic.");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==", "base64");
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
let uploadedKey = null;

function getTestBucket() {
  const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!credentials.client_email || !credentials.private_key || !bucketName) throw new Error("Firebase test configuration is unavailable.");
  const app = getApps().find(candidate => candidate.name === "firebase-browser-diagnostic") || initializeApp({ credential: cert({ projectId: credentials.project_id, clientEmail: credentials.client_email, privateKey: credentials.private_key }), storageBucket: bucketName }, "firebase-browser-diagnostic");
  return getStorage(app).bucket();
}

try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.getByText("Editor de Faro Estructuras", { exact: true }).waitFor({ timeout: 15_000 });

  await page.getByRole("button", { name: "Proyectos" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "firebase-browser-check.png", mimeType: "image/png", buffer: onePixelPng });
  await page.getByText(/se guardó en Firebase/).waitFor({ timeout: 20_000 });
  const uploadedSrc = await page.locator('article img').first().getAttribute("src");
  assert(uploadedSrc?.startsWith("https://firebasestorage.googleapis.com/"), "The editor did not receive a Firebase download URL.");
  uploadedKey = decodeURIComponent(new URL(uploadedSrc).pathname.split("/o/")[1] || "");
  assert(uploadedKey, "The Firebase object key could not be determined for diagnostic cleanup.");

  await page.getByRole("button", { name: "Guardar y ver vista previa" }).click();
  await page.getByText("Vista previa privada", { exact: true }).waitFor({ timeout: 15_000 });
  await page.locator('img[src*="firebasestorage.googleapis.com"]').first().waitFor({ timeout: 15_000 });

  const publicPage = await context.newPage();
  await publicPage.goto(`${origin}/`, { waitUntil: "networkidle" });
  const publicImageSources = await publicPage.locator("img").evaluateAll(images => images.map(image => image.getAttribute("src") || ""));
  assert(!publicImageSources.includes(uploadedSrc || ""), "An unpublished Firebase image appeared on the public site.");
  await publicPage.close();

  await page.getByRole("button", { name: "Seguir editando" }).click();
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  await page.getByText("Borrador descartado. Se restauró la última versión publicada.", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByText("Acceso cliente", { exact: true }).waitFor({ timeout: 15_000 });
  console.log("Firebase browser workflow: upload, draft preview, public isolation, discard, and logout passed.");
} finally {
  await browser.close();
  if (uploadedKey) await getTestBucket().file(uploadedKey).delete({ ignoreNotFound: true });
}
