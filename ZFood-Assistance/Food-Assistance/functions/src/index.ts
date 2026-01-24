/**
 * Firebase Cloud Functions - ZFood Assistance API
 * 
 * Ce fichier est un template minimal. Pour migrer votre backend complet:
 * 1. Importez vos routes depuis server/routes.ts
 * 2. Adaptez le code pour être compatible Cloud Functions
 * 3. Configurez les secrets avec: firebase functions:secrets:set
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";

admin.initializeApp();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.header("origin");
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TODO: Ajoutez vos routes API ici
// Exemple:
// app.get("/api/clients", async (req, res) => { ... });
// app.post("/api/orders", async (req, res) => { ... });

export const api = functions.https.onRequest(app);
