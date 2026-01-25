# Déploiement sur Vercel + Supabase

Guide complet pour déployer ZFood Assistance avec Vercel (backend) et Supabase (base de données).

## Étape 1 : Créer la base de données Supabase

1. Allez sur **https://supabase.com**
2. Cliquez sur **"Start your project"**
3. Connectez-vous avec **GitHub** ou **Email**
4. Créez un nouveau projet :
   - Organization : votre nom
   - Project name : `zfood-assistance`
   - Database Password : créez un mot de passe fort (gardez-le !)
   - Region : choisissez la plus proche de vous
5. Attendez que le projet soit créé (2-3 minutes)

### Récupérer l'URL de connexion

1. Dans Supabase, allez dans **Settings** (icône engrenage)
2. Cliquez sur **Database**
3. Copiez le **Connection string** (URI) sous "Connection pooling"
4. Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez créé

L'URL ressemble à :
```
postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### Créer les tables

1. Dans Supabase, allez dans **SQL Editor**
2. Collez et exécutez ce script :

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_sudo BOOLEAN DEFAULT FALSE,
  must_change_password BOOLEAN DEFAULT TRUE,
  fonction VARCHAR(255),
  phone VARCHAR(50),
  photo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  total_baskets INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  client_name VARCHAR(255),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER,
  is_paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP,
  order_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_production (
  id SERIAL PRIMARY KEY,
  production_date DATE UNIQUE NOT NULL,
  baskets_produced INTEGER DEFAULT 0,
  baskets_sold INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_config (
  id SERIAL PRIMARY KEY,
  default_price INTEGER DEFAULT 500,
  low_stock_alert INTEGER DEFAULT 10,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Créer les utilisateurs par défaut
INSERT INTO users (name, email, password, is_sudo, must_change_password, fonction) VALUES
('Armando', 'armando@zfood.ci', '1234', TRUE, TRUE, 'Administrateur'),
('Zara Ange', 'zara@zfood.ci', '1234', FALSE, TRUE, 'Gestionnaire'),
('Daniel', 'daniel@zfood.ci', '1234', FALSE, TRUE, 'Vendeur')
ON CONFLICT (email) DO NOTHING;
```

## Étape 2 : Déployer sur Vercel

### Option A : Avec GitHub

1. Créez un compte sur **https://github.com** si pas déjà fait
2. Créez un nouveau repository et poussez votre code
3. Allez sur **https://vercel.com**
4. Connectez-vous avec GitHub
5. Importez votre repository
6. Dans les settings, ajoutez la variable d'environnement :
   - `DATABASE_URL` = votre URL Supabase

### Option B : Sans GitHub (Vercel CLI)

1. Installez Vercel CLI :
```bash
npm install -g vercel
```

2. Dans le dossier du projet, exécutez :
```bash
vercel login
vercel
```

3. Suivez les instructions
4. Ajoutez la variable d'environnement dans le dashboard Vercel

## Étape 3 : Configurer l'App Mobile

1. Récupérez l'URL de votre API Vercel (ex: `https://zfood-api.vercel.app`)
2. Mettez à jour `EXPO_PUBLIC_DOMAIN` dans votre app

## Étape 4 : Créer l'APK avec Expo

1. Installez EAS CLI :
```bash
npm install -g eas-cli
```

2. Connectez-vous à Expo :
```bash
eas login
```

3. Créez l'APK :
```bash
eas build --platform android --profile preview
```

4. Téléchargez l'APK depuis le dashboard Expo

## Limites gratuites

### Supabase (gratuit)
- 500 MB de stockage
- 2 GB de bande passante/mois
- Pause après 7 jours d'inactivité (se réactive au premier appel)

### Vercel (gratuit)
- 100 GB de bande passante/mois
- Fonctions serverless illimitées
- Pas de "cold start" comme Render

## URLs de production

Après déploiement :
- **API** : `https://votre-projet.vercel.app`
- **Supabase Dashboard** : `https://app.supabase.com`
