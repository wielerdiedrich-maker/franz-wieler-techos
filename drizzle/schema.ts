import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Key-value content makes approved public copy editable without exposing source code. */
export const siteContent = mysqlTable("site_content", {
  id: int("id").autoincrement().primaryKey(),
  contentKey: varchar("content_key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  updatedBy: int("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/** Project cards are ordered independently so the client can curate the public gallery. */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 120 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  altText: varchar("alt_text", { length: 250 }).notNull(),
  imageUrl: text("image_url").notNull(),
  imageKey: varchar("image_key", { length: 512 }),
  sortOrder: int("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  updatedBy: int("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/** A single server-side draft snapshot keeps unpublished copy and gallery changes off the live site. */
export const siteDrafts = mysqlTable("site_drafts", {
  id: int("id").autoincrement().primaryKey(),
  contentJson: text("content_json").notNull(),
  projectsJson: text("projects_json").notNull(),
  updatedBy: int("updated_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/** The client's independent portal account; its password is stored only as a salted hash. */
export const clientAdminAccounts = mysqlTable("client_admin_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordSalt: varchar("password_salt", { length: 128 }).notNull(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SiteContent = typeof siteContent.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type SiteDraft = typeof siteDrafts.$inferSelect;
export type ClientAdminAccount = typeof clientAdminAccounts.$inferSelect;
