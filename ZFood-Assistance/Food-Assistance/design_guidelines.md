# ZFood Assistance - Design Guidelines

## Brand Identity

**Purpose**: Internal management application for attiéké (traditional Ivorian cassava dish) order tracking. Professional tool for small business administration with advanced AI assistance.

**Aesthetic Direction**: Professional, Natural, and Premium
- Organic sophistication reflecting the artisanal cassava product
- High-end administrative tool feel with natural warmth
- Modern data-driven interface with traditional business values

**Memorable Element**: AI assistant fluent in Ivorian ethnic languages (Baoulé, Dioula, Bété, Sénoufo, Agni, Yacouba) with voice chat capability - bridging traditional commerce with cutting-edge technology.

## Color Palette

**Primary (Cassava Green)**:
- Green 600: `#16a34a` (primary actions, active states)
- Green 900: `#14532d` (headers, emphasis)

**Accent**:
- Orange 500: `#f97316` (alerts, key metrics, CTAs)

**Backgrounds**:
- White: `#FFFFFF` (main surfaces)
- Gray 50: `#F9FAFB` (secondary surfaces, zebra striping)
- Gray 100: `#F3F4F6` (borders, dividers)

**Text**:
- Gray 900: `#111827` (primary text)
- Gray 600: `#4B5563` (secondary text)
- Gray 400: `#9CA3AF` (disabled, placeholders)

**Semantic**:
- Success: `#16a34a` (paid orders)
- Warning: `#f97316` (pending payments)
- Error: `#DC2626` (overdue, critical)

## Typography

**Font**: Inter (800 weight for titles/headers, 600 for subheaders, 400 for body)

**Type Scale**:
- Display: 32px/800 (dashboard main title)
- H1: 24px/800 (section headers)
- H2: 20px/600 (card titles)
- H3: 16px/600 (labels)
- Body: 14px/400 (content)
- Caption: 12px/400 (metadata, timestamps)

## Navigation Architecture

**Root Navigation**: Drawer (left sidebar)

**Main Sections**:
1. Dashboard (Home) - Statistics overview with AI insights
2. Clients (CRM) - Customer management and loyalty tracking
3. Commandes (Orders) - Order entry and filtering
4. Data Center (Stats) - Analytics and reporting
5. Assistant IA - AI chatbot with voice capability
6. Paramètres (Settings) - App configuration

**Security Layer**: SecurityModal overlays entire app when sensitive operations are triggered. Requires super password "ZFOOD" to proceed.

## Screen-by-Screen Specifications

### 1. Dashboard (Home)
**Purpose**: Quick overview of business metrics and AI-powered insights

**Layout**:
- Header: Custom with "ZFood Assistance" title, sync status indicator (cloud icon), notification bell
- Main content: Scrollable grid of metric cards
- Safe area: Top = insets.top + 16px, Bottom = insets.bottom + 16px

**Components**:
- 4 stat cards (Clients, Paniers, Chiffre d'affaires, Impayés) with icons, values, and trend indicators
- AI Insights card (full-width, orange accent border) showing real-time analysis
- Circular logo badge ("Abidjan") in header or footer
- All cards: rounded-3xl (24px radius), soft shadow (shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.08, shadowRadius: 6)

### 2. Clients (CRM)
**Purpose**: Manage customer database and track loyalty progress

**Layout**:
- Header: Search bar, "+ Nouveau Client" button (top-right)
- Main content: Scrollable list of client cards
- Safe area: Top = headerHeight + 16px, Bottom = insets.bottom + 16px

**Components**:
- Client cards: Name, quartier (neighborhood), phone, order count, loyalty progress bar (0-120 paniers)
- Loyalty bar: Visual progress with milestone at 120 (free basket reward)
- Tap card → Navigate to client detail screen (stack navigation)

**Client Detail Screen**:
- Header: Back button, client name, edit button
- Sections: Contact info, order history (chronological list), loyalty status
- Order history items: Date, amount, payment status badge

### 3. Commandes (Orders)
**Purpose**: Record new orders and filter existing ones

**Layout**:
- Header: Filter chips row (Tous, Payé, Impayé, Aujourd'hui, Semaine, Mois)
- Floating action button: "+" (bottom-right, green, 56px diameter, elevation shadow)
- Main content: Scrollable list of order items
- Safe area: Bottom = insets.bottom + 72px (FAB clearance)

**Components**:
- Order list items: Client name, date/time, amount (default 5000 FCFA, editable), payment status toggle
- Filter chips: Pill-shaped, active state = green background
- "+" FAB triggers order entry modal

**Order Entry Modal**:
- Fields: Client selector (dropdown), price input (pre-filled 5000 FCFA), date picker, payment toggle
- Buttons: Cancel (ghost), Enregistrer (green, triggers SecurityModal)

### 4. Data Center (Stats)
**Purpose**: Advanced analytics and tabular data view

**Layout**:
- Header: Period selector tabs
- Main content: Scrollable sections (charts then table)
- Safe area: Standard

**Components**:
- Recharts bar chart: Top clients by order volume
- Google Sheets-style table: Zebra striping (alternate gray-50), horizontal + vertical scroll, fixed header row, columns (Client, Date, Montant, Statut)
- Custom scrollbars: Thin (4px), green thumb

### 5. Assistant IA
**Purpose**: AI-powered support in French and Ivorian languages

**Layout**:
- Header: "Assistant IA ZFood", voice toggle button (top-right)
- Main content: Chat message list (scrollable, anchored to bottom)
- Footer: Message input bar with send button

**Components**:
- User messages: Right-aligned, green bubble
- AI messages: Left-aligned, gray bubble, language indicator badge when non-French
- Voice mode: Waveform animation overlay, "Écoute..." state
- Input bar: Fixed to bottom, raised surface with shadow

### 6. SecurityModal
**Purpose**: Authenticate sensitive operations

**Layout**:
- Full-screen overlay (semi-transparent black backdrop)
- Centered card (max-width 320px)

**Components**:
- Lock icon (orange)
- Title: "Authentification Requise"
- Password input (masked)
- Buttons: Annuler, Valider

**Triggers**:
- Editing order date
- Changing payment status
- Saving new order
- Editing client info

## Assets to Generate

**App Icon** (icon.png):
- Circular green background (#16a34a) with stylized white cassava root or basket motif
- WHERE USED: Device home screen

**Splash Icon** (splash-icon.png):
- Same as app icon
- WHERE USED: Launch screen

**Empty States**:
- empty-clients.png: Illustration of address book or contact card with green accent
  - WHERE USED: Clients screen when no customers added
- empty-orders.png: Illustration of empty clipboard or basket
  - WHERE USED: Orders screen with no results
- empty-stats.png: Illustration of bar chart rising or growth arrow
  - WHERE USED: Data Center with insufficient data

**Branding**:
- abidjan-badge.png: Circular badge with "Abidjan" text, green border
  - WHERE USED: Dashboard header or footer
- ai-avatar.png: Modern AI assistant icon with Ivorian flag colors accent
  - WHERE USED: AI Assistant screen, chat bubbles

**Decorative**:
- cassava-pattern.png: Subtle repeating cassava leaf pattern (light opacity)
  - WHERE USED: Dashboard background (optional)

All illustrations should use the green-orange color palette and maintain a professional, modern aesthetic suitable for business administration.