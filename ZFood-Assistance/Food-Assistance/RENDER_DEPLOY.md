# Déploiement sur Render.com

Ce guide explique comment déployer ZFood Assistance sur Render.com (gratuit, sans carte bancaire).

## Prérequis

- Compte GitHub (gratuit)
- Compte Render.com (gratuit)
- Base de données Neon configurée (voir MIGRATION_GUIDE.md)

## Étape 1 : Pousser le code sur GitHub

1. Créez un nouveau repository sur GitHub
2. Poussez votre code :
```bash
git remote add origin https://github.com/VOTRE_USERNAME/zfood-assistance.git
git push -u origin main
```

## Étape 2 : Créer le Backend sur Render

1. Allez sur **https://dashboard.render.com**
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre repository GitHub
4. Configurez :
   - **Name**: `zfood-api`
   - **Region**: Frankfurt (EU Central)
   - **Branch**: main
   - **Root Directory**: `ZFood-Assistance/Food-Assistance`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `npm run start:server`
   - **Instance Type**: Free

5. Ajoutez les variables d'environnement :
   - `DATABASE_URL` = votre URL Neon
   - `NODE_ENV` = production
   - `AI_INTEGRATIONS_OPENAI_API_KEY` = votre clé OpenAI (optionnel)
   - `AI_INTEGRATIONS_OPENROUTER_API_KEY` = votre clé OpenRouter (optionnel)

6. Cliquez sur **"Create Web Service"**

## Étape 3 : Créer le Dashboard Web sur Render

1. Cliquez sur **"New +"** → **"Static Site"**
2. Connectez le même repository
3. Configurez :
   - **Name**: `zfood-webapp`
   - **Branch**: main
   - **Root Directory**: `ZFood-Assistance/Food-Assistance/webapp`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Ajoutez les variables d'environnement :
   - `VITE_API_URL` = `https://zfood-api.onrender.com` (l'URL de votre API)

5. Cliquez sur **"Create Static Site"**

## Étape 4 : Configurer l'App Mobile

Mettez à jour `EXPO_PUBLIC_DOMAIN` dans votre app mobile pour pointer vers votre API Render :

```
EXPO_PUBLIC_DOMAIN=https://zfood-api.onrender.com
```

## URLs de production

Après déploiement, vos URLs seront :
- **API**: `https://zfood-api.onrender.com`
- **Dashboard Web**: `https://zfood-webapp.onrender.com`

## Limitations du plan gratuit Render

- L'API s'endort après 15 minutes d'inactivité
- Premier appel après inactivité peut prendre 30-60 secondes
- 750 heures de fonctionnement par mois (suffisant pour usage normal)

## Maintenir l'API active (optionnel)

Pour éviter que l'API s'endorme, vous pouvez utiliser un service comme :
- **UptimeRobot** (gratuit) : https://uptimerobot.com
- Configurez un ping toutes les 14 minutes vers `https://zfood-api.onrender.com/api/health`

## Mise à jour

Chaque fois que vous poussez du code sur GitHub, Render redéploie automatiquement.
