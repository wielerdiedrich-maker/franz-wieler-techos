// Custom client portal authentication; separate from Manus OAuth and never exposes password material to the browser.
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookie } from "cookie";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { clientAdminAccounts } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
export const CLIENT_ADMIN_COOKIE = "client_admin_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
  if (existing) {
    const existingHash = await deriveHash(password, existing.passwordSalt);
    const emailMatches = existing.email === email;
    const passwordMatches = existingHash === existing.passwordHash;
    if (emailMatches && passwordMatches) return existing;

    const salt = randomBytes(32).toString("hex");
    const passwordHash = await deriveHash(password, salt);
    await db.update(clientAdminAccounts).set({ email, passwordSalt: salt, passwordHash }).where(eq(clientAdminAccounts.id, existing.id));
    const [updated] = await db.select().from(clientAdminAccounts).where(eq(clientAdminAccounts.id, existing.id)).limit(1);
    if (!updated) throw new Error("Client admin account could not be updated");
    return updated;
  }

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
