import express from "express";
import type { Request, Response, NextFunction } from "express";
import { db } from "../server/db";
import { activityLogs, dailyProduction, stockConfig, clients, orders, users } from "../shared/schema";
import { desc, eq, sql, and, gte, lte, like, or } from "drizzle-orm";

const app = express();

app.use((req, res, next) => {
  const origin = req.header("origin");
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/users", async (_req, res) => {
  try {
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
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password, isSudo, fonction, phone, photo } = req.body;
    const newUser = await db.insert(users).values({
      name,
      email,
      password,
      isSudo: isSudo || false,
      mustChangePassword: true,
      fonction,
      phone,
      photo,
    }).returning();
    res.json(newUser[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user[0].password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const { password: _, ...userWithoutPassword } = user[0];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

app.get("/api/clients", async (_req, res) => {
  try {
    const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
    res.json(allClients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    const newClient = await db.insert(clients).values(req.body).returning();
    res.json(newClient[0]);
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({ error: "Failed to create client" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const { startDate, endDate, isPaid, clientId, search } = req.query;
    let query = db.select().from(orders);
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(orders.orderDate, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(orders.orderDate, endDate as string));
    }
    if (isPaid !== undefined) {
      conditions.push(eq(orders.isPaid, isPaid === "true"));
    }
    if (clientId) {
      conditions.push(eq(orders.clientId, parseInt(clientId as string)));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const allOrders = await query.orderBy(desc(orders.orderDate));
    res.json(allOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const newOrder = await db.insert(orders).values(req.body).returning();
    res.json(newOrder[0]);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.update(orders)
      .set(req.body)
      .where(eq(orders.id, parseInt(id)))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const totalClients = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const totalRevenue = await db.select({ 
      sum: sql<number>`COALESCE(SUM(quantity * unit_price), 0)` 
    }).from(orders).where(eq(orders.isPaid, true));
    const unpaidAmount = await db.select({ 
      sum: sql<number>`COALESCE(SUM(quantity * unit_price), 0)` 
    }).from(orders).where(eq(orders.isPaid, false));
    
    res.json({
      totalClients: totalClients[0]?.count || 0,
      totalOrders: totalOrders[0]?.count || 0,
      totalRevenue: totalRevenue[0]?.sum || 0,
      unpaidAmount: unpaidAmount[0]?.sum || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default app;
