# Guide de Déploiement Firebase - ZFood Assistance

Ce guide explique comment déployer l'application ZFood Assistance sur Firebase.

## Prérequis

1. **Créer un projet Firebase**
   - Allez sur [Firebase Console](https://console.firebase.google.com/)
   - Créez un nouveau projet ou utilisez un existant
   - Notez l'ID du projet

2. **Configurer le projet**
   - Modifiez le fichier `.firebaserc` et remplacez `your-firebase-project-id` par votre ID de projet Firebase

## Structure du projet

```
├── webapp/           # Application web React/Vite (Firebase Hosting)
├── functions/        # Cloud Functions (API backend)
├── firebase.json     # Configuration Firebase
└── .firebaserc       # Configuration du projet Firebase
```

## Étapes de déploiement

### 1. Se connecter à Firebase

```bash
firebase login
```

### 2. Construire et déployer tout

```bash
npm run firebase:deploy
```

### 3. Déployer individuellement

**Webapp uniquement (Firebase Hosting):**
```bash
npm run firebase:build:webapp
npm run firebase:deploy:hosting
```

**Functions uniquement:**
```bash
npm run firebase:build:functions
npm run firebase:deploy:functions
```

## Tester localement

Pour tester avec les émulateurs Firebase:

```bash
npm run firebase:emulators
```

## Configuration de l'API

### Option 1: Utiliser Firebase Cloud Functions (recommandé pour APIs simples)

Le dossier `functions/` contient un template minimal. Pour migrer votre backend:

1. Copiez vos routes de `server/routes.ts` vers `functions/src/`
2. Adaptez le code pour être compatible Cloud Functions (pas d'accès au système de fichiers local)
3. Configurez les variables d'environnement avec `firebase functions:secrets:set`

Dans la webapp, l'API sera disponible à:
```javascript
// https://YOUR-PROJECT.cloudfunctions.net/api
```

### Option 2: Héberger le backend séparément

Si votre backend utilise des fonctionnalités non compatibles avec Cloud Functions (système de fichiers, WebSockets, etc.), vous pouvez:

1. Déployer le backend sur **Cloud Run** ou un autre service
2. Configurer Firebase Hosting pour rediriger `/api/**` vers votre backend externe

Modifiez `firebase.json`:
```json
"rewrites": [
  {
    "source": "/api/**",
    "run": {
      "serviceId": "your-cloud-run-service",
      "region": "us-central1"
    }
  }
]
```

### Option 3: Webapp statique uniquement

Si la webapp n'a pas besoin de backend (utilise uniquement AsyncStorage local), supprimez simplement la section "functions" de `firebase.json`.

## App Mobile (Expo)

Pour créer un APK avec Expo:

1. Installez EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configurez EAS:
   ```bash
   eas build:configure
   ```

3. Mettez à jour l'URL de l'API dans l'app pour pointer vers Firebase Functions

4. Créez l'APK:
   ```bash
   eas build -p android --profile preview
   ```

## Variables d'environnement

Pour Firebase Functions, configurez les secrets:

```bash
firebase functions:secrets:set SECRET_NAME
```

Ou utilisez un fichier `.env` local (pas commité) pour le développement.

## Ressources

- [Documentation Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Documentation Cloud Functions](https://firebase.google.com/docs/functions)
- [Documentation Expo EAS Build](https://docs.expo.dev/build/introduction/)
