// Custom client portal authentication; separate from Manus OAuth and never exposes password material to the browser.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookie } from "cookie";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Request, Response } from "express";
import { clientAdminAccounts, clientPasswordResetTokens } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
export const CLIENT_ADMIN_COOKIE = "client_admin_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

function getSigningKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

async function deriveHash(password: string, salt: string) {
  const derived = await scrypt(password, salt, 64) as Buffer;
  return derived.toString("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getDatabase() {
  const db = await getDb();
  if (!db) throw new Error("Client admin database is unavailable");
  return db;
}

/** Creates the initial client account exactly once from securely injected project credentials. */
export async function ensureClientAdminAccount() {
  const db = await getDatabase();
  const email = normalizeEmail(process.env.CLIENT_ADMIN_EMAIL || "");
  const password = process.env.CLIENT_ADMIN_PASSWORD || "";
  if (!email || !password) throw new Error("Initial client admin credentials are not configured");
  const [existing] = await db.select().from(clientAdminAccounts).limit(1);
  // Existing portal credentials are authoritative. This prevents a recovered password from being overwritten
  // by the bootstrap secret during a later login.
  if (existing) return existing;

  const salt = randomBytes(32).toString("hex");
  const passwordHash = await deriveHash(password, salt);
  await db.insert(clientAdminAccounts).values({ email, passwordSalt: salt, passwordHash });
  const [created] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.email, email)).limit(1);
  if (!created) throw new Error("Client admin account could not be initialized");
  return created;
}

export async function validateClientAdminCredentials(email: string, password: string) {
  await ensureClientAdminAccount();
  const db = await getDatabase();
  const [account] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.email, normalizeEmail(email))).limit(1);
  if (!account) return null;
  const candidateHash = await deriveHash(password, account.passwordSalt);
  const expected = Buffer.from(account.passwordHash, "hex");
  const candidate = Buffer.from(candidateHash, "hex");
  if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) return null;
  return account;
}

/** Creates a one-time reset token. The raw token is returned only for immediate email delivery. */
export async function createClientPasswordResetToken(email: string) {
  await ensureClientAdminAccount();
  const db = await getDatabase();
  const [account] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.email, normalizeEmail(email))).limit(1);
  if (!account) return null;

  const now = new Date();
  const [recent] = await db.select().from(clientPasswordResetTokens).where(and(eq(clientPasswordResetTokens.clientAdminId, account.id), gt(clientPasswordResetTokens.createdAt, new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS)))).limit(1);
  if (recent) return null;

  await db.update(clientPasswordResetTokens).set({ usedAt: now }).where(and(eq(clientPasswordResetTokens.clientAdminId, account.id), isNull(clientPasswordResetTokens.usedAt)));
  const token = randomBytes(32).toString("base64url");
  await db.insert(clientPasswordResetTokens).values({
    clientAdminId: account.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
  });
  return { account, token };
}

/** Consumes a valid reset token once and persists a fresh salted password hash. */
export async function resetClientAdminPassword(token: string, password: string) {
  const db = await getDatabase();
  const now = new Date();
  const tokenHash = hashResetToken(token);
  const result = await db.update(clientPasswordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(clientPasswordResetTokens.tokenHash, tokenHash), isNull(clientPasswordResetTokens.usedAt), gt(clientPasswordResetTokens.expiresAt, now)));
  const affectedRows = Number((result as unknown as [{ affectedRows?: number }])[0]?.affectedRows || 0);
  if (affectedRows !== 1) return false;

  const [resetToken] = await db.select().from(clientPasswordResetTokens).where(eq(clientPasswordResetTokens.tokenHash, tokenHash)).limit(1);
  if (!resetToken) return false;
  const salt = randomBytes(32).toString("hex");
  const passwordHash = await deriveHash(password, salt);
  await db.update(clientAdminAccounts).set({ passwordSalt: salt, passwordHash }).where(eq(clientAdminAccounts.id, resetToken.clientAdminId));
  return true;
}

export async function createClientAdminSession(account: { id: number; email: string }) {
  return new SignJWT({ email: account.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(account.id))
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_MAX_AGE_MS) / 1000))
    .sign(getSigningKey());
}

export async function getClientAdminFromRequest(req: Request) {
  const token = parseCookie(req.headers?.cookie || "")[CLIENT_ADMIN_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id < 1) return null;
    const db = await getDatabase();
    const [account] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.id, id)).limit(1);
    return account || null;
  } catch {
    return null;
  }
}

export function setClientAdminCookie(req: Request, res: Response, session: string) {
  res.cookie(CLIENT_ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: req.protocol === "https" || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearClientAdminCookie(req: Request, res: Response) {
  res.clearCookie(CLIENT_ADMIN_COOKIE, {
    httpOnly: true,
    secure: req.protocol === "https" || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
