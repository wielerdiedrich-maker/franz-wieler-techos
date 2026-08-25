import { describe, expect, it } from "vitest";
import { deleteFirebaseObject, uploadProjectImageToFirebase } from "./firebaseStorage";

describe("Firebase project-image storage", () => {
  it("uploads a small project image and exposes it through a Firebase download URL", async () => {
    // A one-pixel transparent PNG validates real upload and public-gallery delivery without leaving a persistent test file.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL2dAAAAABJRU5ErkJggg==", "base64");
    const uploaded = await uploadProjectImageToFirebase({ ownerId: 0, fileName: "firebase-test.png", mimeType: "image/png", data: png });

    try {
      expect(uploaded.key).toMatch(/^projects\/0\//);
      expect(uploaded.url).toContain("firebasestorage.googleapis.com");
      const response = await fetch(uploaded.url);
      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type")).toContain("image/png");
    } finally {
      await deleteFirebaseObject(uploaded.key);
    }
  }, 30_000);
});
