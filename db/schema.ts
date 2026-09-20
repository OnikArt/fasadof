import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  message: text("message").notNull().default(""),
  product: text("product").notNull().default(""),
  material: text("material").notNull().default(""),
  area: text("area").notNull().default(""),
  page: text("page").notNull().default(""),
  attribution: text("attribution", { mode: "json" }).notNull(),
  status: text("status").notNull().default("NEW"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at"),
  deletedById: text("deleted_by_id"),
  deletedByName: text("deleted_by_name"),
  deletedByEmail: text("deleted_by_email"),
});

export const leadAuditEvents = sqliteTable("lead_audit_events", {
  id: text("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  eventType: text("event_type").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  actorEmail: text("actor_email").notNull(),
  previousStatus: text("previous_status").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("AUTO"),
  page: text("page").notNull().default(""),
  source: text("source").notNull().default("Direct"),
  customerToken: text("customer_token").notNull().default(""),
  operatorId: text("operator_id"),
  operatorName: text("operator_name"),
  closedAt: text("closed_at"),
  closedBy: text("closed_by"),
  attribution: text("attribution", { mode: "json" }).notNull(),
  contact: text("contact", { mode: "json" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  authorName: text("author_name"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const operators = sqliteTable("operators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("operator"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at"),
});

export const operatorSessions = sqliteTable("operator_sessions", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const chatRatings = sqliteTable("chat_ratings", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull().default(""),
  employeeId: text("employee_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
