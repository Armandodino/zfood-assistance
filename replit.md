# ZFood Assistance

## Overview

ZFood Assistance is a professional mobile application for managing attiéké (traditional Ivorian cassava dish) order tracking for a small food business in Abidjan, Côte d'Ivoire. The app serves as an internal business management tool with the following core features:

- **Client Management**: Track customers with contact info, order history, and loyalty progress toward 120-basket goal
- **Order Tracking**: Record orders with payment status filtering (paid/unpaid, by date range)
- **Dashboard Analytics**: Real-time statistics on revenue, unpaid amounts, and business insights
- **AI Assistant**: Multilingual chatbot supporting French and Ivorian ethnic languages (Baoulé, Dioula, Bété, Sénoufo, Agni, Yacouba) with voice chat capability
- **Security**: Password-protected sensitive operations with auto-logout after 10 minutes of inactivity
- **Web Dashboard**: Companion React web application for desktop supervision

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, new architecture enabled
- **Navigation**: React Navigation with Drawer as main navigation pattern (6 sections: Dashboard, Clients, Orders, Data Center, AI Assistant, Settings)
- **State Management**: React Context API for Auth, Data, Security, and Toast notifications
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: Custom component library with animated cards, FAB buttons, filter chips, and modals
- **Styling**: Custom theme system with ZFood brand colors (green #16a34a primary, orange #f97316 accent)
- **Fonts**: Inter and Poppins via expo-google-fonts
- **Animations**: React Native Reanimated for smooth transitions with haptic feedback via expo-haptics
- **Local Storage**: AsyncStorage for data persistence and offline support

### Backend (Express.js)
- **Server**: Express 5 running on port 8000 for API, port 5000 for web dashboard
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema management
- **API Design**: RESTful endpoints for clients, orders, users, and activity logs CRUD operations
- **AI Integration**: OpenAI and OpenRouter APIs for multilingual assistant capabilities
- **File Storage**: Replit Object Storage integration for image uploads

### Web Dashboard (React + Vite)
- **Framework**: React 18 with Vite build system
- **Styling**: Tailwind CSS with custom ZFood color palette
- **Charts**: Recharts for interactive data visualization
- **Purpose**: Desktop supervision interface with real-time statistics

### Data Layer
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` with Zod validation via drizzle-zod
- **Migrations**: Generated to `./migrations` directory via drizzle-kit
- **Tables**: users, clients, orders, activity_logs, daily_production, stock_config

### Authentication & Security
- **Multi-admin System**: Email/password authentication with role-based access (sudo vs regular users)
- **Security Modal**: Super password (ZFOOD) required for sensitive operations (editing orders, changing payment status)
- **Session Management**: 10-minute inactivity timeout with 1-minute warning before auto-logout
- **Password Policy**: First-time users required to change default password
- **Activity Logging**: Audit trail for all admin actions stored in database

### Build & Deployment
- **Development**: `npm run expo:dev` for mobile, `npm run server:dev` for backend, `npm run webapp:dev` for web dashboard
- **Production Build**: EAS Build configuration for Android APK and App Bundle
- **Firebase Deployment**: 
  - Firebase Hosting configured for webapp (webapp/dist)
  - Firebase Functions template for API backend (functions/)
  - Scripts: `npm run firebase:build`, `npm run firebase:deploy`
  - Guide complet: voir `FIREBASE_DEPLOY.md`
- **Environment**: EXPO_PUBLIC_DOMAIN required for API URL configuration

## External Dependencies

### AI Services
- **OpenAI API**: Used for text-to-speech and transcription via Whisper
- **OpenRouter**: Provides access to various LLM models for the multilingual chatbot

### Cloud Services
- **PostgreSQL Database**: Primary data storage (DATABASE_URL environment variable)
- **Google Sheets**: Optional cloud sync integration via Google APIs
- **Google Cloud Storage**: Available for file storage
- **Replit Object Storage**: Used for user photo uploads

### Third-Party Libraries
- **expo-av**: Audio recording and playback for voice chat
- **expo-image-picker**: Photo selection for user profiles
- **googleapis**: Google Sheets and Drive API integration
- **pg**: PostgreSQL client for Node.js

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain for mobile app
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`: OpenRouter API key
- Google connector credentials for Sheets sync (optional)