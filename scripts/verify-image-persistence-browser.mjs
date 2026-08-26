import { chromium } from "playwright-core";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const origin = process.env.CLIENT_PORTAL_TEST_URL || "https://3000-irjktw136h16mf2yn441l-89c7b69e.us4.manus.computer";
const email = process.env.CLIENT_ADMIN_EMAIL;
const password = process.env.CLIENT_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Client portal test credentials are unavailable.");
const fileName = `persistence-browser-check-${Date.now()}.png`;
const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9EwAAAABJRU5ErkJggg==", "base64");

async function removeTemporaryUpload() {
  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!rawCredentials || !bucketName) return;
  const credentials = JSON.parse(rawCredentials);
  const app = getApps().find(item => item.name === "persistence-browser-cleanup") || initializeApp({
    credential: cert({ projectId: credentials.project_id, clientEmail: credentials.client_email, privateKey: credentials.private_key }), storageBucket: bucketName,
  }, "persistence-browser-cleanup");
  const [files] = await getStorage(app).bucket().getFiles({ prefix: "projects/1/" });
  await Promise.all(files.filter(file => file.name.endsWith(fileName)).map(file => file.delete({ ignoreNotFound: true })));
}

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
  const savedImageUrl = await firstCard.locator("img").getAttribute("src");
  if (!savedImageUrl?.includes("firebasestorage.googleapis.com")) throw new Error("Upload did not render a Firebase URL.");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Subir o reemplazar foto" }).first().waitFor({ timeout: 15_000 });
  const reloadedImageUrl = await page.locator("article").filter({ has: page.getByRole("button", { name: "Eliminar proyecto" }) }).first().locator("img").getAttribute("src");
  if (reloadedImageUrl !== savedImageUrl) throw new Error("The Firebase image association did not persist after reload.");

  await page.getByRole("button", { name: "Descartar borrador" }).click();
  await page.getByText("Borrador descartado", { exact: false }).waitFor({ timeout: 15_000 });
  console.log("Firebase upload draft persistence browser workflow: passed.");
} finally {
  await browser.close();
  await removeTemporaryUpload();
}
