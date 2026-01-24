import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isSudo: boolean("is_sudo").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  fonction: text("fonction"),
  phone: text("phone"),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Activity logs for admin audit trail
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  adminEmail: text("admin_email").notNull(),
  actionType: text("action_type").notNull(), // 'login', 'logout', 'create_client', 'update_client', 'delete_client', 'create_order', 'update_order', 'delete_order', 'update_payment'
  entityType: text("entity_type"), // 'client', 'order', null for login/logout
  entityId: varchar("entity_id"), // ID of the affected client or order
  entityName: text("entity_name"), // Name of the affected client or order reference
  details: jsonb("details"), // Additional details about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Daily production records for stock tracking
export const dailyProduction = pgTable("daily_production", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  basketsProduced: integer("baskets_produced").notNull().default(0),
  basketsSold: integer("baskets_sold").notNull().default(0),
  stockBefore: integer("stock_before").notNull().default(0),
  stockAfter: integer("stock_after").notNull().default(0),
  notes: text("notes"),
  adminId: varchar("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyProductionSchema = createInsertSchema(dailyProduction).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyProduction = z.infer<typeof insertDailyProductionSchema>;
export type DailyProduction = typeof dailyProduction.$inferSelect;

// Stock configuration
export const stockConfig = pgTable("stock_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  currentStock: integer("current_stock").notNull().default(0),
  minStockAlert: integer("min_stock_alert").notNull().default(10),
  basketPrice: integer("basket_price").notNull().default(500),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by"),
  updatedByName: text("updated_by_name"),
});

export type StockConfig = typeof stockConfig.$inferSelect;

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  quartier: text("quartier").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  amount: integer("amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  date: text("date").notNull(), // YYYY-MM-DD
  collectionDate: text("collection_date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
