// Firebase Storage is used only from the server so service-account credentials never reach the browser.
import { randomUUID } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const FIREBASE_APP_NAME = "faro-project-images";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getFirebaseApp(): App {
  const existing = getApps().find(app => app.name === FIREBASE_APP_NAME);
  if (existing) return existing;

  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!rawCredentials || !bucketName) {
    throw new Error("Firebase Storage configuration is missing.");
  }

  const credentials = JSON.parse(rawCredentials) as FirebaseServiceAccount;
  return initializeApp(
    {
      credential: cert({ projectId: credentials.project_id, clientEmail: credentials.client_email, privateKey: credentials.private_key }),
      storageBucket: bucketName,
    },
    FIREBASE_APP_NAME,
  );
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-140) || "imagen";
}

/** Uploads a project image and returns a tokenized Firebase download URL safe for the public gallery. */
export async function uploadProjectImageToFirebase(input: {
  ownerId: number;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: Buffer;
}) {
  const bucket = getStorage(getFirebaseApp()).bucket();
  const key = `projects/${input.ownerId}/${Date.now()}-${randomUUID()}-${safeFileName(input.fileName)}`;
  const downloadToken = randomUUID();
  const file = bucket.file(key);

  await file.save(input.data, {
    resumable: false,
    contentType: input.mimeType,
    metadata: {
      cacheControl: "public,max-age=31536000,immutable",
      contentType: input.mimeType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  const encodedKey = encodeURIComponent(key);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedKey}?alt=media&token=${downloadToken}`;
  return { key, url };
}

/** Used only by integration tests to remove their temporary Firebase object. */
export async function deleteFirebaseObject(key: string) {
  await getStorage(getFirebaseApp()).bucket().file(key).delete({ ignoreNotFound: true });
}
