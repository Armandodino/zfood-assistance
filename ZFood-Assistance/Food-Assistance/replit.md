# ZFood Assistance v2.0

Application mobile de gestion de carnet de commandes d'attiéké pour ZFood - Abidjan.

## Vue d'ensemble

ZFood Assistance est une application interne professionnelle pour gérer les clients, commandes et statistiques de vente d'attiéké. L'application inclut un assistant IA multilingue supportant le français et les langues ivoiriennes.

## Architecture

### Frontend (Expo React Native)
- **Navigation**: Drawer navigation avec 6 sections principales
- **Écrans**: Dashboard, Clients, Commandes, Data Center, Assistant IA, Paramètres
- **Composants**: Cards statistiques, filtres, FAB, modals de sécurité
- **Stockage**: AsyncStorage pour la persistance locale

### Backend (Express.js)
- Port 8000 pour l'API REST
- Endpoints pour clients, commandes, et logs d'activité
- Base de données PostgreSQL avec Drizzle ORM

### Web Dashboard (React + Vite)
- Port 5000 pour l'interface web bureau
- Graphiques interactifs avec Recharts
- Tableau de bord avec statistiques en temps réel
- Interface de supervision des agents

## Structure des fichiers

```
client/
├── App.tsx                 # Point d'entrée avec providers
├── components/             # Composants réutilisables
│   ├── AIInsightCard.tsx   # Carte d'insights IA
│   ├── ChatBubble.tsx      # Bulles de chat pour l'assistant
│   ├── ClientCard.tsx      # Carte client avec fidélité
│   ├── EmptyState.tsx      # États vides avec illustrations
│   ├── FAB.tsx             # Bouton d'action flottant
│   ├── FilterChip.tsx      # Filtres de commandes
│   ├── OrderCard.tsx       # Carte de commande
│   ├── SecurityModal.tsx   # Modal de sécurité admin
│   └── StatCard.tsx        # Cartes statistiques
├── contexts/
│   ├── AuthContext.tsx     # Authentification multi-admin (email/mdp)
│   ├── DataContext.tsx     # Gestion des données clients/commandes
│   ├── SecurityContext.tsx # Authentification opérations sensibles
│   └── ToastContext.tsx    # Système de notifications toast
├── navigation/
│   ├── DrawerNavigator.tsx # Navigation principale (drawer)
│   └── RootStackNavigator.tsx # Stack pour modals et détails
└── screens/
    ├── AddClientScreen.tsx
    ├── AddOrderScreen.tsx
    ├── AIAssistantScreen.tsx
    ├── ChangePasswordScreen.tsx  # Changement mot de passe obligatoire
    ├── ClientDetailScreen.tsx
    ├── ClientsScreen.tsx
    ├── DashboardScreen.tsx
    ├── DataCenterScreen.tsx
    ├── LoginScreen.tsx           # Connexion email/mot de passe
    ├── OrdersScreen.tsx
    └── SettingsScreen.tsx
```

## Fonctionnalités

### 1. Tableau de bord
- 4 cartes statistiques: Clients, Paniers, Chiffre d'affaires, Impayés
- Carte d'Insights IA avec analyse en temps réel
- Badge "Abidjan" et indicateur de synchronisation

### 2. Gestion des Clients (CRM)
- Ajout de clients (Nom, Quartier, Téléphone)
- Fiche détaillée avec historique des commandes
- Programme de fidélité: 120 paniers = 1 panier gratuit
- Barre de progression visuelle

### 3. Gestion des Commandes
- Enregistrement rapide (prix par défaut: 5000 FCFA)
- Filtres: Tous, Payé, Impayé, Aujourd'hui, Semaine, Mois
- Basculement du statut de paiement (avec authentification)

### 4. Data Center
- Graphique des meilleurs clients
- Tableau style Google Sheets avec données zébrées

### 5. Assistant IA
- Chat multilingue (Français, Baoulé, Dioula, Bété, Sénoufo, Agni, Yacouba)
- Réponses contextuelles basées sur les données

### 6. Authentification Multi-Admin
- Système de connexion par email/mot de passe
- 3 comptes admin configurés:
  - **Armando** (armando@zfood.ci) - Super Admin avec privilèges sudo
  - **Zara Ange** (zaraange@zfood.ci) - Admin standard
  - **Daniel** (daniel@zfood.ci) - Admin standard
- Mot de passe par défaut pour nouveaux admins: "0000"
- Changement de mot de passe obligatoire à la première connexion
- Auto-déconnexion après 10 minutes d'inactivité (avertissement 1 minute avant)
- Gestion des profils dans Paramètres (modifier nom, email, mot de passe)
- Super Admin peut réinitialiser les mots de passe des autres admins

### 7. Sécurité Opérations Sensibles
- Modal d'authentification pour opérations sensibles
- Mot de passe: **ZFOOD**
- Déclencheurs: ajout/modification client, ajout commande, changement statut paiement

## Thème et Design

### Couleurs
- Primary: #16a34a (vert cassava)
- Primary Dark: #14532d
- Accent: #f97316 (orange chaud)
- Backgrounds: blanc et gris clairs

### Typographie
- Font: Inter (800 pour titres, 600 pour sous-titres, 400 pour corps)

### Style
- Bords très arrondis (BorderRadius 2xl-3xl)
- Ombres douces
- Animations fluides (fade-in, scale)

## Données

### Client
```typescript
interface Client {
  id: string;
  name: string;
  quartier: string;
  phone: string;
  createdAt: string;
}
```

### Commande
```typescript
interface Order {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  isPaid: boolean;
  date: string;
  createdAt: string;
}
```

## Workflows

- **Start Backend**: `npm run server:dev` - Lance le serveur Express sur port 5000
- **Start Frontend**: `npm run expo:dev` - Lance Expo Metro bundler sur port 8081

## Déploiement Firebase

Le projet est configuré pour Firebase:

### Structure Firebase
- **Firebase Hosting**: webapp/ -> webapp/dist après build
- **Firebase Functions**: functions/ pour l'API backend

### Scripts de déploiement
```bash
npm run firebase:build:webapp    # Build webapp pour hosting
npm run firebase:build:functions # Build Cloud Functions
npm run firebase:deploy          # Déploie tout
npm run firebase:emulators       # Test local
```

### Configuration
1. Créer un projet sur Firebase Console
2. Modifier `.firebaserc` avec votre project ID
3. `firebase login` pour s'authentifier
4. `npm run firebase:deploy` pour déployer

## Notes de développement

- Utiliser AsyncStorage pour la persistance (pas de base de données externe)
- Toujours demander l'authentification pour les opérations sensibles
- Respecter la charte graphique verte/orange
- Ne pas utiliser d'emojis dans l'interface
