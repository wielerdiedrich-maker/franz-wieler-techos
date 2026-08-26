import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
if (!rawCredentials || !bucketName) throw new Error("Firebase credentials are unavailable.");
const credentials = JSON.parse(rawCredentials);
const app = getApps().find(item => item.name === "image-recovery-inventory") || initializeApp({
  credential: cert({ projectId: credentials.project_id, clientEmail: credentials.client_email, privateKey: credentials.private_key }),
  storageBucket: bucketName,
}, "image-recovery-inventory");
const [files] = await getStorage(app).bucket().getFiles({ prefix: "projects/" });
console.log(JSON.stringify(files.map(file => ({ key: file.name, size: Number(file.metadata.size || 0), created: file.metadata.timeCreated || null, updated: file.metadata.updated || null, contentType: file.metadata.contentType || null })), null, 2));
