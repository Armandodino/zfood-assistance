import type { VercelRequest, VercelResponse } from "@vercel/node";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";
import { pgTable, serial, varchar, text, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool);

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  isSudo: boolean("is_sudo").default(false).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  fonction: varchar("fonction", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  totalBaskets: integer("total_baskets").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  clientName: varchar("client_name", { length: 255 }),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price"),
  isPaid: boolean("is_paid").default(false),
  paymentDate: timestamp("payment_date"),
  orderDate: date("order_date").defaultNow(),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-password, x-admin-id, x-admin-name");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url, method } = req;
  const path = url?.split("?")[0] || "";

  try {
    // Root
    if (path === "/" || path === "") {
      return res.json({ 
        message: "ZFood Assistance API", 
        status: "online",
        version: "1.0.0",
        endpoints: ["/api/health", "/api/users", "/api/clients", "/api/orders", "/api/stats"]
      });
    }

    // Health check
    if (path === "/api/health") {
      return res.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    // Users
    if (path === "/api/users" && method === "GET") {
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        isSudo: users.isSudo,
        mustChangePassword: users.mustChangePassword,
        fonction: users.fonction,
        phone: users.phone,
        photo: users.photo,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt));
      return res.json(allUsers);
    }

    if (path === "/api/users" && method === "POST") {
      const { name, email, password, isSudo, fonction, phone, photo } = req.body;
      const newUser = await db.insert(users).values({
        name, email, password,
        isSudo: isSudo || false,
        mustChangePassword: true,
        fonction, phone, photo,
      }).returning();
      return res.json(newUser[0]);
    }

    // Auth
    if ((path === "/api/auth/login" || path === "/api/users/login") && method === "POST") {
      const { email, password } = req.body;
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (user.length === 0 || user[0].password !== password) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      const { password: _, ...userWithoutPassword } = user[0];
      return res.json(userWithoutPassword);
    }

    // Clients
    if (path === "/api/clients" && method === "GET") {
      const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
      return res.json(allClients);
    }

    if (path === "/api/clients" && method === "POST") {
      const newClient = await db.insert(clients).values(req.body).returning();
      return res.json(newClient[0]);
    }

    // Orders
    if (path === "/api/orders" && method === "GET") {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.orderDate));
      return res.json(allOrders);
    }

    if (path === "/api/orders" && method === "POST") {
      const newOrder = await db.insert(orders).values(req.body).returning();
      return res.json(newOrder[0]);
    }

    if (path.startsWith("/api/orders/") && method === "PATCH") {
      const id = parseInt(path.split("/").pop() || "0");
      const updated = await db.update(orders).set(req.body).where(eq(orders.id, id)).returning();
      return res.json(updated[0]);
    }

    // Stats
    if (path === "/api/stats" && method === "GET") {
      const totalClients = await db.select({ count: sql<number>`count(*)` }).from(clients);
      const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);
      const totalRevenue = await db.select({ 
        sum: sql<number>`COALESCE(SUM(quantity * unit_price), 0)` 
      }).from(orders).where(eq(orders.isPaid, true));
      const unpaidAmount = await db.select({ 
        sum: sql<number>`COALESCE(SUM(quantity * unit_price), 0)` 
      }).from(orders).where(eq(orders.isPaid, false));
      
      return res.json({
        totalClients: totalClients[0]?.count || 0,
        totalOrders: totalOrders[0]?.count || 0,
        totalRevenue: totalRevenue[0]?.sum || 0,
        unpaidAmount: unpaidAmount[0]?.sum || 0,
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
