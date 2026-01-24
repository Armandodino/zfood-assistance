# ZFood Assistance

## Overview

ZFood Assistance is a professional mobile application for managing attiéké (traditional Ivorian cassava dish) order tracking for a small food business in Abidjan, Côte d'Ivoire. The app serves as an internal CRM and order management system with the following core features:

- **Client Management**: Track customers with contact info, order history, and loyalty progress toward 120-basket goal
- **Order Tracking**: Record orders with payment status filtering (paid/unpaid, by date range)
- **Dashboard Analytics**: Real-time statistics on revenue, unpaid amounts, and business insights
- **AI Assistant**: Multilingual chatbot supporting French and Ivorian ethnic languages (Baoulé, Dioula, Bété, Sénoufo, Agni, Yacouba)
- **Security**: Password-protected sensitive operations with auto-logout after 10 minutes of inactivity

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo React Native)
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation with Drawer as main navigation (6 sections: Dashboard, Clients, Orders, Data Center, AI Assistant, Settings)
- **State Management**: React Context API for Auth, Data, Security, and Toast notifications
- **UI Components**: Custom component library with animated cards, FAB buttons, filter chips, and modals
- **Styling**: Custom theme system with ZFood brand colors (green #16a34a primary, orange #f97316 accent)
- **Fonts**: Inter and Poppins via expo-google-fonts
- **Animations**: React Native Reanimated for smooth transitions and haptic feedback
- **Local Storage**: AsyncStorage for data persistence

### Backend (Express.js)
- **Server**: Express 5 running on port 5000
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **API Design**: RESTful endpoints for clients and orders CRUD operations
- **Static Serving**: Serves Expo static web bundles in production

### Data Layer
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` with Zod validation via drizzle-zod
- **Migrations**: Generated to `./migrations` directory
- **Sync Strategy**: Local-first with cloud sync to Google Sheets (optional integration)

### Authentication & Security
- **Multi-admin System**: Email/password authentication with role-based access (sudo vs regular users)
- **Security Modal**: Super password (ZFOOD) required for sensitive operations (editing orders, changing payment status)
- **Session Management**: 10-minute inactivity timeout with 1-minute warning before auto-logout
- **Password Policy**: First-time users required to change default password

### Build & Deployment
- **Development**: `expo:dev` for mobile, `server:dev` for backend
- **Production Build**: EAS Build configuration for Android APK and App Bundle
- **Web Output**: Single-page application output via Expo web

## External Dependencies

### Third-Party Services
- **Google Sheets API**: Optional sync for order/client data backup via googleapis package
- **Google Gemini**: AI assistant powered by Gemini 1.5 for multilingual chat support

### Key NPM Packages
- **expo-notifications**: Push notification support for unpaid order reminders
- **expo-haptics**: Tactile feedback for user interactions
- **@tanstack/react-query**: Server state management and caching
- **react-native-reanimated**: Advanced animations
- **react-native-gesture-handler**: Touch gesture handling
- **drizzle-orm** + **drizzle-zod**: Database ORM with schema validation

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain for mobile app requests
- `REPLIT_DEV_DOMAIN`: Development domain for CORS and proxy configuration