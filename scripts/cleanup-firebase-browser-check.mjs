// Removes only the temporary file created by the first Firebase browser diagnostic run.
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
if (!credentials.client_email || !credentials.private_key || !bucketName) throw new Error("Firebase test configuration is unavailable.");

const app = initializeApp({ credential: cert({ projectId: credentials.project_id, clientEmail: credentials.client_email, privateKey: credentials.private_key }), storageBucket: bucketName }, "firebase-browser-cleanup");
const bucket = getStorage(app).bucket();
const [files] = await bucket.getFiles({ prefix: "projects/" });
const temporaryFiles = files.filter(file => file.name.endsWith("-firebase-browser-check.png"));
await Promise.all(temporaryFiles.map(file => file.delete({ ignoreNotFound: true })));
console.log(`Removed ${temporaryFiles.length} temporary Firebase browser diagnostic object(s).`);
