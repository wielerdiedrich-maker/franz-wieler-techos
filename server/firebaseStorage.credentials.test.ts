import { createSign } from "node:crypto";
import { describe, expect, it } from "vitest";

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

describe("Firebase Storage credentials", () => {
  it("obtains an access token and reads the configured bucket metadata", async () => {
    const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    expect(rawCredentials).toBeTruthy();
    expect(bucketName).toBeTruthy();

    const credentials = JSON.parse(rawCredentials!) as { client_email: string; private_key: string; token_uri: string };
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64Url(
      JSON.stringify({
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/devstorage.read_only",
        aud: credentials.token_uri,
        iat: issuedAt,
        exp: issuedAt + 300,
      }),
    );
    const unsignedToken = `${header}.${claims}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedToken);
    const assertion = `${unsignedToken}.${signer.sign(credentials.private_key, "base64url")}`;

    const tokenResponse = await fetch(credentials.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    expect(tokenResponse.ok).toBe(true);
    const token = (await tokenResponse.json()) as { access_token?: string };
    expect(token.access_token).toBeTruthy();

    const bucketResponse = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName!)}`,
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const bucketsResponse = await fetch(
      `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(JSON.parse(rawCredentials!).project_id)}`,
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const bucketNames = bucketsResponse.ok
      ? ((await bucketsResponse.json()) as { items?: Array<{ name?: string }> }).items?.map(item => item.name).filter(Boolean) || []
      : [];
    if (!bucketResponse.ok) {
      const buckets = bucketNames.join(", ") || "none";
      throw new Error(
        `Firebase bucket metadata request failed (${bucketResponse.status}): ${await bucketResponse.text()}; accessible buckets: ${buckets}`,
      );
    }
    expect(bucketResponse.ok).toBe(true);
    expect(bucketNames).toContain(bucketName);
  }, 30_000);
});
