import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { clientAdminAccounts, clientPasswordResetTokens } from "../drizzle/schema";
import { createClientPasswordResetToken, resetClientAdminPassword } from "./clientAdminAuth";
import { getDb } from "./db";

const createdTokenHashes: string[] = [];
const createdAccountIds: number[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  await Promise.all(createdTokenHashes.splice(0).map(tokenHash => db.delete(clientPasswordResetTokens).where(eq(clientPasswordResetTokens.tokenHash, tokenHash))));
  await Promise.all(createdAccountIds.splice(0).map(id => db.delete(clientAdminAccounts).where(eq(clientAdminAccounts.id, id))));
});

describe("client password recovery", () => {
  it("stores only a hashed one-time reset token and rejects invalid token use", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const email = `recovery-test-${randomUUID()}@example.invalid`;
    await db.insert(clientAdminAccounts).values({ email, passwordSalt: "test-salt", passwordHash: "test-hash" });
    const [account] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.email, email)).limit(1);
    if (!account) throw new Error("Temporary recovery account was not created");
    createdAccountIds.push(account.id);

    const reset = await createClientPasswordResetToken(email);
    expect(reset).not.toBeNull();
    if (!reset) return;

    const tokenHash = createHash("sha256").update(reset.token).digest("hex");
    createdTokenHashes.push(tokenHash);
    expect(reset.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);

    const [stored] = await db.select().from(clientPasswordResetTokens).where(eq(clientPasswordResetTokens.tokenHash, tokenHash)).limit(1);
    expect(stored?.tokenHash).toBe(tokenHash);
    expect(stored?.tokenHash).not.toBe(reset.token);
    expect(stored?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await resetClientAdminPassword("not-a-valid-reset-token", "A-new-test-password-2026")).toBe(false);
    expect(await resetClientAdminPassword(reset.token, "A-new-test-password-2026")).toBe(true);
    expect(await resetClientAdminPassword(reset.token, "Another-test-password-2026")).toBe(false);
    const [updatedAccount] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.id, account.id)).limit(1);
    expect(updatedAccount?.passwordHash).not.toBe("test-hash");
  }, 30_000);
});
