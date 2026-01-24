# Guide de Migration - Indépendance de Replit

Ce guide explique comment rendre votre projet ZFood Assistance totalement indépendant de Replit.

## Vue d'ensemble

Pour être 100% indépendant de Replit, vous devez :
1. Créer une base de données PostgreSQL externe (gratuit avec Neon)
2. Migrer vos données
3. Déployer sur Firebase

---

## Étape 1 : Créer une base de données sur Neon (GRATUIT)

### 1.1 Créer un compte Neon
1. Allez sur **https://neon.tech**
2. Cliquez sur "Sign Up" et connectez-vous avec GitHub ou Google
3. C'est **100% gratuit** pour le tier de base

### 1.2 Créer un projet
1. Cliquez sur "New Project"
2. Nom du projet : `zfood-assistance`
3. Région : choisissez la plus proche de vos utilisateurs (Europe ou Afrique)
4. Cliquez sur "Create Project"

### 1.3 Récupérer l'URL de connexion
1. Dans le tableau de bord Neon, copiez le **Connection String**
2. Il ressemble à : `postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. **Gardez cette URL précieusement !**

---

## Étape 2 : Créer les tables

### 2.1 Option A : Via Drizzle (recommandé)
```bash
# Dans le terminal, avec votre nouvelle DATABASE_URL
DATABASE_URL="votre_url_neon" npm run db:push
```

### 2.2 Option B : Via le dashboard Neon
Allez dans SQL Editor sur Neon et exécutez ce script :

```sql
-- Créer les tables
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_sudo BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  fonction TEXT,
  phone TEXT,
  photo TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quartier TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL,
  client_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP,
  date TEXT NOT NULL,
  collection_date TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id VARCHAR NOT NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id VARCHAR,
  entity_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_production (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  baskets_produced INTEGER NOT NULL DEFAULT 0,
  baskets_sold INTEGER NOT NULL DEFAULT 0,
  stock_before INTEGER NOT NULL DEFAULT 0,
  stock_after INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  admin_id VARCHAR NOT NULL,
  admin_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_config (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 10,
  basket_price INTEGER NOT NULL DEFAULT 500,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_by VARCHAR,
  updated_by_name TEXT
);

-- Créer les admins par défaut (mot de passe temporaire, à changer à la première connexion)
-- IMPORTANT: Les utilisateurs devront changer leur mot de passe à la première connexion
INSERT INTO users (name, email, password, is_sudo, must_change_password) VALUES 
  ('Armando', 'armando@zfood.ci', '0000', true, true),
  ('Zara Ange', 'zaraange@zfood.ci', '0000', false, true),
  ('Daniel', 'daniel@zfood.ci', '0000', false, true)
ON CONFLICT (email) DO NOTHING;

-- Initialiser la configuration du stock
INSERT INTO stock_config (current_stock, min_stock_alert, basket_price) VALUES (0, 10, 500)
ON CONFLICT DO NOTHING;
```

---

## Étape 3 : Migrer vos données (si vous en avez)

### 3.1 Exporter depuis Replit
```bash
# Dans le terminal Replit
npx tsx scripts/export-data.ts
```

### 3.2 Importer vers Neon
```bash
DATABASE_URL="votre_url_neon" npx tsx scripts/import-data.ts
```

---

## Étape 4 : Configurer Firebase avec la nouvelle base de données

### 4.1 Ajouter le secret dans Firebase
```bash
cd functions
firebase functions:secrets:set DATABASE_URL
# Collez votre URL Neon quand demandé
```

### 4.2 Mettre à jour le code des Functions
Modifiez `functions/src/index.ts` pour utiliser vos vraies routes.

---

## Étape 5 : Configurer l'app mobile

Mettez à jour l'URL de l'API dans votre app Expo :

1. Modifiez `app.json` :
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_DOMAIN": "https://votre-projet.web.app"
    }
  }
}
```

2. Recréez l'APK :
```bash
eas build -p android --profile preview
```

---

## Note sur la sécurité des mots de passe

Les mots de passe utilisateur sont stockés en texte brut dans cette version de l'application. C'est adapté pour une utilisation interne avec un nombre limité d'administrateurs de confiance.

Pour une sécurité renforcée en production, vous pouvez :
1. Activer le SSL sur la connexion Neon (déjà inclus par défaut)
2. Utiliser des mots de passe forts pour les admins
3. Limiter l'accès réseau à la base de données

## Résumé des coûts

| Service | Coût |
|---------|------|
| Neon (base de données) | GRATUIT (tier de base) |
| Firebase Hosting | GRATUIT (jusqu'à 10 GB/mois) |
| Firebase Functions | GRATUIT (2M invocations/mois) |
| **Total** | **0 FCFA** |

---

## Support

Si vous avez des questions :
- Neon : https://neon.tech/docs
- Firebase : https://firebase.google.com/docs
- Expo : https://docs.expo.dev
