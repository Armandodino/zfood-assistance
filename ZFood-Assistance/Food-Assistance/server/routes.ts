import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { syncDataToSheet } from "./google-sheets";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { db } from "./db";
import { activityLogs, insertActivityLogSchema, dailyProduction, stockConfig, clients, orders, users } from "../shared/schema";
import { desc, eq, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import OpenAI, { toFile } from "openai";

const ADMIN_PASSWORD = "ZFOOD";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Serve the WebApp dashboard
  app.get("/webapp", (_req, res) => {
    const webappPath = path.join(__dirname, "templates", "webapp.html");
    if (fs.existsSync(webappPath)) {
      res.sendFile(webappPath);
    } else {
      res.status(404).send("WebApp non disponible");
    }
  });

  // API: Get all users/admins
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
      }).from(users).orderBy(users.createdAt);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API: Update user profile
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, fonction, phone, photo, mustChangePassword } = req.body;
      
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (password !== undefined) updateData.password = password;
      if (fonction !== undefined) updateData.fonction = fonction;
      if (phone !== undefined) updateData.phone = phone;
      if (photo !== undefined) updateData.photo = photo;
      if (mustChangePassword !== undefined) updateData.mustChangePassword = mustChangePassword;
      
      const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
      if (!updated) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API: User login
  app.post("/api/users/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API: Get all clients
  app.get("/api/clients", async (_req, res) => {
    try {
      const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
      res.json(allClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API: Add a new client
  app.post("/api/clients", async (req, res) => {
    try {
      const { name, quartier, phone } = req.body;
      
      if (!name || !quartier) {
        return res.status(400).json({ error: "Nom et quartier requis" });
      }
      
      const [newClient] = await db.insert(clients).values({
        name,
        quartier,
        phone: phone || "",
      }).returning();
      
      res.json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Erreur lors de la creation du client" });
    }
  });

  // API: Update client
  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [updated] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Client introuvable" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Erreur lors de la mise a jour" });
    }
  });

  // API: Delete client
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      await db.delete(orders).where(eq(orders.clientId, id));
      const [deleted] = await db.delete(clients).where(eq(clients.id, id)).returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Client introuvable" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // API: Get client orders with summary stats
  app.get("/api/clients/:clientId/orders", async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
      if (!client) {
        return res.status(404).json({ error: "Client non trouvé" });
      }
      
      const clientOrders = await db.select().from(orders).where(eq(orders.clientId, clientId)).orderBy(desc(orders.createdAt));
      
      const totalOrders = clientOrders.length;
      const totalBaskets = clientOrders.reduce((sum, o) => sum + o.quantity, 0);
      const totalAmount = clientOrders.reduce((sum, o) => sum + o.amount, 0);
      const totalPaid = clientOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const totalUnpaid = totalAmount - totalPaid;
      
      res.json({ 
        client, 
        orders: clientOrders,
        totalOrders,
        totalBaskets,
        totalAmount,
        totalPaid,
        totalUnpaid
      });
    } catch (error) {
      console.error("Error fetching client orders:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API: Get all orders
  app.get("/api/orders", async (_req, res) => {
    try {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      res.json(allOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // API: Add a new order
  app.post("/api/orders", async (req, res) => {
    try {
      const { clientId, clientName, quantity, amount, paidAmount, isPaid, date, collectionDate } = req.body;
      
      if (!clientId || !clientName) {
        return res.status(400).json({ error: "Client requis" });
      }
      
      const [newOrder] = await db.insert(orders).values({
        clientId,
        clientName,
        quantity: quantity || 1,
        amount: amount || 5000,
        paidAmount: paidAmount || 0,
        isPaid: isPaid || false,
        date: date || new Date().toISOString().split('T')[0],
        collectionDate: collectionDate || new Date().toISOString().split('T')[0],
      }).returning();
      
      res.json(newOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Erreur lors de la creation de la commande" });
    }
  });

  // API: Update order
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.isPaid === true && !updates.paidAt) {
        updates.paidAt = new Date();
      }
      
      const [updated] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Commande introuvable" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Erreur lors de la mise a jour" });
    }
  });

  // API: Delete order
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deleted] = await db.delete(orders).where(eq(orders.id, id)).returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Commande introuvable" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Erreur lors de la suppression" });
    }
  });

  // Sync data to Google Sheets
  app.post("/api/sync-sheets", async (req, res) => {
    try {
      const allClients = await db.select().from(clients);
      const allOrders = await db.select().from(orders);

      const result = await syncDataToSheet(allClients, allOrders);
      res.json(result);
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Erreur lors de la synchronisation" 
      });
    }
  });

  app.get("/api/sync-status", async (_req, res) => {
    try {
      const clientCount = await db.select({ count: sql<number>`count(*)` }).from(clients);
      const orderCount = await db.select({ count: sql<number>`count(*)` }).from(orders);
      
      res.json({ 
        connected: true, 
        message: "Base de données connectée",
        clientCount: Number(clientCount[0]?.count || 0),
        orderCount: Number(orderCount[0]?.count || 0)
      });
    } catch (error) {
      res.json({ 
        connected: false, 
        message: "Erreur de connexion à la base de données" 
      });
    }
  });

  // ============================================
  // ACTIVITY LOGS API - Admin Audit Trail
  // ============================================

  // Log an activity (called from mobile app)
  app.post("/api/activity-logs", async (req, res) => {
    try {
      const logData = insertActivityLogSchema.parse(req.body);
      
      const [newLog] = await db.insert(activityLogs).values({
        ...logData,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      }).returning();
      
      res.json(newLog);
    } catch (error: any) {
      console.error("Error logging activity:", error);
      res.status(400).json({ error: error.message || "Erreur lors de l'enregistrement" });
    }
  });

  // Get all activity logs (sudo only - requires password in header)
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      const { limit = "50", adminId } = req.query;
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Accès non autorisé" });
      }
      
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      
      let query = db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limitNum);
      
      if (adminId) {
        query = db.select().from(activityLogs)
          .where(eq(activityLogs.adminId, adminId as string))
          .orderBy(desc(activityLogs.createdAt))
          .limit(limitNum);
      }
      
      const logs = await query;
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des logs" });
    }
  });

  // Get activity summary for sudo dashboard
  app.get("/api/activity-logs/summary", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Accès non autorisé" });
      }
      
      // Get recent logins (limited to 20)
      const recentLogins = await db.select().from(activityLogs)
        .where(eq(activityLogs.actionType, 'login'))
        .orderBy(desc(activityLogs.createdAt))
        .limit(20);
      
      // Get recent actions (limited to 50)
      const recentActions = await db.select().from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(50);
      
      // Get recent logs for admin summary (limited to last 200 for performance)
      const recentLogsForSummary = await db.select().from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(200);
      
      const actionsByAdmin: Record<string, { name: string, count: number, lastAction: string }> = {};
      
      for (const log of recentLogsForSummary) {
        if (!actionsByAdmin[log.adminId]) {
          actionsByAdmin[log.adminId] = {
            name: log.adminName,
            count: 0,
            lastAction: log.createdAt?.toISOString() || ''
          };
        }
        actionsByAdmin[log.adminId].count++;
        if (new Date(log.createdAt || 0) > new Date(actionsByAdmin[log.adminId].lastAction)) {
          actionsByAdmin[log.adminId].lastAction = log.createdAt?.toISOString() || '';
        }
      }
      
      res.json({
        recentLogins,
        recentActions,
        actionsByAdmin: Object.entries(actionsByAdmin).map(([id, data]) => ({
          adminId: id,
          ...data
        }))
      });
    } catch (error: any) {
      console.error("Error fetching activity summary:", error);
      res.status(500).json({ error: "Erreur lors de la récupération du résumé" });
    }
  });

  // Delete activity logs (sudo only)
  app.delete("/api/activity-logs", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      const { logId, deleteOld } = req.query;
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Accès non autorisé - sudo requis" });
      }
      
      if (logId) {
        await db.delete(activityLogs).where(eq(activityLogs.id, logId as string));
        return res.json({ success: true, message: "Log supprimé" });
      }
      
      if (deleteOld === 'true') {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const result = await db.delete(activityLogs)
          .where(sql`${activityLogs.createdAt} < ${threeDaysAgo.toISOString()}`);
        
        return res.json({ success: true, message: "Logs de plus de 3 jours supprimés" });
      }
      
      await db.delete(activityLogs);
      return res.json({ success: true, message: "Tous les logs supprimés" });
    } catch (error: any) {
      console.error("Error deleting activity logs:", error);
      res.status(500).json({ error: "Erreur lors de la suppression des logs" });
    }
  });

  // Auto-cleanup old logs (called on server start and every 24 hours)
  const cleanupOldLogs = async () => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      await db.delete(activityLogs)
        .where(sql`${activityLogs.createdAt} < ${threeDaysAgo.toISOString()}`);
      
      console.log("[AUTO-CLEANUP] Old activity logs (>3 days) deleted");
    } catch (error) {
      console.error("[AUTO-CLEANUP] Error cleaning up old logs:", error);
    }
  };
  
  cleanupOldLogs();
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

  // AI Business Advice endpoint
  app.post("/api/ai-advice", async (req, res) => {
    try {
      const { stats } = req.body;
      
      const prompt = `Tu es un conseiller d'affaires expert pour une petite entreprise de vente d'attiéké à Abidjan, Côte d'Ivoire.

Voici les statistiques actuelles de l'entreprise ZFood:
- Revenu total: ${stats.totalRevenue} FCFA
- Montant payé: ${stats.paidTotal} FCFA
- Montant impayé: ${stats.unpaidTotal} FCFA
- Nombre de clients: ${stats.totalClients}
- Commandes aujourd'hui: ${stats.todayOrders}
- Revenu aujourd'hui: ${stats.todayRevenue} FCFA
- Nombre total de commandes: ${stats.totalOrders}

Donne 3-5 conseils pratiques et personnalisés pour:
1. Augmenter les revenus
2. Réduire les impayés
3. Fidéliser les clients
4. Optimiser les opérations

Réponds en français simple et direct, avec des actions concrètes.`;

      const response = await openrouter.chat.completions.create({
        model: "deepseek/deepseek-v3.2",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      });

      const advice = response.choices[0]?.message?.content || "Aucun conseil disponible";
      res.json({ advice });
    } catch (error: any) {
      console.error("Error getting AI advice:", error);
      res.status(500).json({ error: "Erreur lors de la génération des conseils" });
    }
  });

  // AI Chat endpoint for mobile app
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message, context, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message requis" });
      }

      const systemPrompt = `Tu es l'assistant IA de ZFood, expert en gestion de vente d'attiéké à Abidjan, Côte d'Ivoire.

CONTEXTE MÉTIER:
- ${context?.totalClients || 0} clients actifs
- ${context?.totalOrders || 0} commandes enregistrées  
- CA total: ${(context?.totalRevenue || 0).toLocaleString()} FCFA
- Impayés: ${(context?.unpaidTotal || 0).toLocaleString()} FCFA
- Prix panier: 5000 FCFA
- Programme fidélité: 120 paniers/mois = 1 panier cadeau

COMPÉTENCES:
1. Gestion clients et commandes
2. Analyse des statistiques de vente
3. Conseils business pour attiéké
4. Support multilingue: Français + langues ivoiriennes (Baoulé, Dioula, Bété, Sénoufo, Agni, Yacouba)

STYLE:
- Réponses courtes et directes (2-4 phrases max)
- Ton professionnel mais chaleureux
- Utiliser des chiffres quand pertinent
- Si langue locale détectée, répondre dans cette langue avec traduction FR

EXEMPLES DE RÉPONSES:
Q: "Comment vont les ventes?"
R: "Les ventes se portent bien! Vous avez ${context?.totalOrders || 0} commandes pour un CA de ${(context?.totalRevenue || 0).toLocaleString()} FCFA. Attention aux ${(context?.unpaidTotal || 0).toLocaleString()} FCFA d'impayés à récupérer."`;

      // Build conversation history for context
      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        { role: "system", content: systemPrompt }
      ];
      
      // Add recent history (last 6 messages for context)
      if (history && Array.isArray(history)) {
        const recentHistory = history.slice(-6);
        for (const msg of recentHistory) {
          messages.push({
            role: msg.isUser ? "user" : "assistant",
            content: msg.text
          });
        }
      }
      
      // Add current message
      messages.push({ role: "user", content: message });

      const response = await openrouter.chat.completions.create({
        model: "deepseek/deepseek-chat",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse.";
      res.json({ reply });
    } catch (error: any) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ error: "Erreur lors de la communication avec l'assistant" });
    }
  });

  // Voice transcription endpoint using OpenAI Whisper
  app.post("/api/voice-transcribe", async (req, res) => {
    try {
      const { audio } = req.body;
      
      if (!audio) {
        return res.status(400).json({ error: "Audio data requis" });
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audio, "base64");
      
      // Create file for OpenAI
      const file = await toFile(audioBuffer, "audio.m4a");
      
      // Transcribe with OpenAI
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        language: "fr",
      });

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Error transcribing voice:", error);
      res.status(500).json({ error: "Erreur lors de la transcription" });
    }
  });

  // ============================================
  // STOCK MANAGEMENT API
  // ============================================

  // Get current stock config
  app.get("/api/stock", async (_req, res) => {
    try {
      const configs = await db.select().from(stockConfig).limit(1);
      if (configs.length === 0) {
        // Initialize stock config if not exists
        const [newConfig] = await db.insert(stockConfig).values({
          currentStock: 0,
          minStockAlert: 10,
          basketPrice: 500,
        }).returning();
        return res.json(newConfig);
      }
      res.json(configs[0]);
    } catch (error: any) {
      console.error("Error fetching stock:", error);
      res.status(500).json({ error: "Erreur lors de la récupération du stock" });
    }
  });

  // Update stock config
  app.patch("/api/stock", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      const adminId = req.headers['x-admin-id'] as string || 'unknown';
      const adminName = req.headers['x-admin-name'] as string || 'Admin';
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Mot de passe incorrect" });
      }
      
      const { currentStock, minStockAlert, basketPrice } = req.body;
      
      const configs = await db.select().from(stockConfig).limit(1);
      
      if (configs.length === 0) {
        const [newConfig] = await db.insert(stockConfig).values({
          currentStock: currentStock ?? 0,
          minStockAlert: minStockAlert ?? 10,
          basketPrice: basketPrice ?? 500,
          updatedBy: adminId,
          updatedByName: adminName,
        }).returning();
        
        // Log activity for sudo notification
        await db.insert(activityLogs).values({
          adminId,
          adminName,
          adminEmail: '',
          actionType: 'update_stock',
          entityType: 'stock',
          entityName: 'Configuration stock',
          details: { currentStock, minStockAlert, basketPrice },
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        });
        
        return res.json(newConfig);
      }
      
      const updateData: any = { updatedAt: new Date(), updatedBy: adminId, updatedByName: adminName };
      if (currentStock !== undefined) updateData.currentStock = currentStock;
      if (minStockAlert !== undefined) updateData.minStockAlert = minStockAlert;
      if (basketPrice !== undefined) updateData.basketPrice = basketPrice;
      
      const [updated] = await db.update(stockConfig)
        .set(updateData)
        .where(eq(stockConfig.id, configs[0].id))
        .returning();
      
      // Log activity for sudo notification
      await db.insert(activityLogs).values({
        adminId,
        adminName,
        adminEmail: '',
        actionType: 'update_stock',
        entityType: 'stock',
        entityName: 'Configuration stock',
        details: { currentStock, minStockAlert, basketPrice },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating stock:", error);
      res.status(500).json({ error: "Erreur lors de la mise à jour du stock" });
    }
  });

  // Get daily production records
  app.get("/api/production", async (req, res) => {
    try {
      const { limit = "30" } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 30, 100);
      
      const records = await db.select().from(dailyProduction)
        .orderBy(desc(dailyProduction.date))
        .limit(limitNum);
      
      res.json(records);
    } catch (error: any) {
      console.error("Error fetching production:", error);
      res.status(500).json({ error: "Erreur lors de la récupération de la production" });
    }
  });

  // Add daily production record
  app.post("/api/production", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      const adminId = req.headers['x-admin-id'] as string || 'unknown';
      const adminName = req.headers['x-admin-name'] as string || 'Admin';
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Mot de passe incorrect" });
      }
      
      const { date, basketsProduced, notes } = req.body;
      
      if (!date || basketsProduced === undefined) {
        return res.status(400).json({ error: "Date et nombre de paniers requis" });
      }
      
      // Get current stock
      const configs = await db.select().from(stockConfig).limit(1);
      const currentStock = configs.length > 0 ? configs[0].currentStock : 0;
      
      // Calculate sold baskets from orders on this date
      const dayOrders = await db.select().from(orders).where(sql`date = ${date}`);
      const basketsSold = dayOrders.reduce((sum: number, o: any) => sum + (o.quantity || 0), 0);
      
      const newStock = currentStock + basketsProduced - basketsSold;
      
      const [record] = await db.insert(dailyProduction).values({
        date,
        basketsProduced,
        basketsSold,
        stockBefore: currentStock,
        stockAfter: newStock,
        notes: notes || '',
        adminId,
        adminName,
      }).returning();
      
      // Update stock config
      if (configs.length > 0) {
        await db.update(stockConfig)
          .set({ currentStock: newStock, updatedAt: new Date(), updatedBy: adminId, updatedByName: adminName })
          .where(eq(stockConfig.id, configs[0].id));
      }
      
      // Log activity for sudo notification
      await db.insert(activityLogs).values({
        adminId,
        adminName,
        adminEmail: '',
        actionType: 'create_production',
        entityType: 'production',
        entityName: `Production du ${date}`,
        details: { basketsProduced, basketsSold, stockBefore: currentStock, stockAfter: newStock },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json(record);
    } catch (error: any) {
      console.error("Error adding production:", error);
      res.status(500).json({ error: "Erreur lors de l'ajout de la production" });
    }
  });

  // DELETE production entry (sudo only)
  app.delete("/api/production/:id", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      const adminId = req.headers['x-admin-id'] as string || 'unknown';
      const adminName = req.headers['x-admin-name'] as string || 'Admin';
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Mot de passe incorrect" });
      }
      
      const { id } = req.params;
      
      // Get the production entry before deleting
      const [existingProduction] = await db.select().from(dailyProduction).where(eq(dailyProduction.id, id));
      
      if (!existingProduction) {
        return res.status(404).json({ error: "Production non trouvée" });
      }
      
      // Delete the production entry
      await db.delete(dailyProduction).where(eq(dailyProduction.id, id));
      
      // Update stock by subtracting the baskets produced
      const configs = await db.select().from(stockConfig).limit(1);
      if (configs.length > 0) {
        const newStock = configs[0].currentStock - existingProduction.basketsProduced;
        await db.update(stockConfig)
          .set({ currentStock: newStock, updatedAt: new Date(), updatedBy: adminId, updatedByName: adminName })
          .where(eq(stockConfig.id, configs[0].id));
      }
      
      // Log activity
      await db.insert(activityLogs).values({
        adminId,
        adminName,
        adminEmail: '',
        actionType: 'delete_production',
        entityType: 'production',
        entityName: `Production du ${existingProduction.date}`,
        details: { basketsProduced: existingProduction.basketsProduced, date: existingProduction.date },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting production:", error);
      res.status(500).json({ error: "Erreur lors de la suppression de la production" });
    }
  });

  // PUT update production entry (sudo only)
  app.put("/api/production/:id", async (req, res) => {
    try {
      const password = req.headers['x-admin-password'] as string;
      const adminId = req.headers['x-admin-id'] as string || 'unknown';
      const adminName = req.headers['x-admin-name'] as string || 'Admin';
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Mot de passe incorrect" });
      }
      
      const { id } = req.params;
      const { basketsProduced, notes } = req.body;
      
      // Get the existing production entry
      const [existingProduction] = await db.select().from(dailyProduction).where(eq(dailyProduction.id, id));
      
      if (!existingProduction) {
        return res.status(404).json({ error: "Production non trouvée" });
      }
      
      // Calculate stock difference
      const basketsDiff = basketsProduced - existingProduction.basketsProduced;
      
      // Update production entry
      const [updatedProduction] = await db.update(dailyProduction)
        .set({
          basketsProduced,
          stockAfter: existingProduction.stockAfter + basketsDiff,
          notes: notes !== undefined ? notes : existingProduction.notes,
        })
        .where(eq(dailyProduction.id, id))
        .returning();
      
      // Update stock config
      const configs = await db.select().from(stockConfig).limit(1);
      if (configs.length > 0) {
        const newStock = configs[0].currentStock + basketsDiff;
        await db.update(stockConfig)
          .set({ currentStock: newStock, updatedAt: new Date(), updatedBy: adminId, updatedByName: adminName })
          .where(eq(stockConfig.id, configs[0].id));
      }
      
      // Log activity
      await db.insert(activityLogs).values({
        adminId,
        adminName,
        adminEmail: '',
        actionType: 'update_production',
        entityType: 'production',
        entityName: `Production du ${existingProduction.date}`,
        details: { oldBaskets: existingProduction.basketsProduced, newBaskets: basketsProduced, diff: basketsDiff },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json(updatedProduction);
    } catch (error: any) {
      console.error("Error updating production:", error);
      res.status(500).json({ error: "Erreur lors de la modification de la production" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
