# HomeScout Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOMESCOUT APP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │  iOS/Android    │    │  Chrome Browser │    │    Web Landing Page     │  │
│  │  React Native   │    │    Extension    │    │      (Marketing)        │  │
│  │    (Expo)       │    │                 │    │                         │  │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────────────┘  │
│           │                      │                                           │
│           │    Deep Links        │   Direct Save                            │
│           │    (homescout://)    │   to Supabase                            │
│           │                      │                                           │
│           ▼                      ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         SUPABASE BACKEND                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ PostgreSQL   │  │     Auth     │  │   Storage    │                 │  │
│  │  │  Database    │  │   (OAuth)    │  │   (Photos)   │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       ANTHROPIC CLAUDE API                             │  │
│  │                    (AI-Powered Property Analysis)                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile App Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    React Native (Expo)                       │ │
│  │  • React 19.1 + TypeScript                                  │ │
│  │  • Expo SDK 54                                              │ │
│  │  • React Navigation (Native Stack + Bottom Tabs)            │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         STATE MANAGEMENT                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      Zustand Stores                          │ │
│  │  • authStore      - Authentication & user state             │ │
│  │  • propertyStore  - Properties CRUD & sync                  │ │
│  │  • clientStore    - Clients management (brokers)            │ │
│  │  • settingsStore  - App preferences & API keys              │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Supabase Client  │  AsyncStorage  │  SecureStore           │ │
│  │  (Remote Data)    │  (Local Cache) │  (Sensitive Data)      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROOT NAVIGATOR                              │
│                   (Native Stack Navigator)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │    AUTH NAVIGATOR    │    │      MAIN NAVIGATOR          │   │
│  │  (Not Authenticated) │    │     (Authenticated)          │   │
│  ├──────────────────────┤    ├──────────────────────────────┤   │
│  │ • OnboardingScreen   │    │                              │   │
│  │ • LoginScreen        │    │   ┌─────────────────────┐    │   │
│  │ • SignUpScreen       │    │   │  BOTTOM TAB NAV     │    │   │
│  └──────────────────────┘    │   ├─────────────────────┤    │   │
│                              │   │                     │    │   │
│                              │   │  HOME BUYER VIEW:   │    │   │
│                              │   │  ├─ Properties      │    │   │
│                              │   │  ├─ Map             │    │   │
│                              │   │  ├─ Compare         │    │   │
│                              │   │  ├─ Calculators     │    │   │
│                              │   │  └─ Settings        │    │   │
│                              │   │                     │    │   │
│                              │   │  BROKER VIEW:       │    │   │
│                              │   │  ├─ Dashboard       │    │   │
│                              │   │  ├─ Properties      │    │   │
│                              │   │  ├─ Showings        │    │   │
│                              │   │  ├─ Clients         │    │   │
│                              │   │  └─ Settings        │    │   │
│                              │   │                     │    │   │
│                              │   └─────────────────────┘    │   │
│                              │                              │   │
│                              │   HOME STACK:                │   │
│                              │   ├─ PropertyList            │   │
│                              │   ├─ PropertyDetail          │   │
│                              │   └─ AddProperty             │   │
│                              │                              │   │
│                              └──────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management (Zustand Stores)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ZUSTAND STORES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                       authStore                              │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  State:                                                     │ │
│  │  • user: User | null                                        │ │
│  │  • household: Household | null                              │ │
│  │  • session: Session | null                                  │ │
│  │  • isDemoMode: boolean                                      │ │
│  │  • isLoading, isInitialized                                 │ │
│  │                                                             │ │
│  │  Actions:                                                   │ │
│  │  • initialize()      - Check existing session               │ │
│  │  • signIn()          - Email/password auth                  │ │
│  │  • signInWithGoogle()- OAuth flow                           │ │
│  │  • signInAsDemo()    - Demo mode                            │ │
│  │  • signOut()         - Clear session                        │ │
│  │  • createHousehold() - Create new household                 │ │
│  │  • joinHousehold()   - Join via invite code                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      propertyStore                           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  State:                                                     │ │
│  │  • properties: Property[]                                   │ │
│  │  • selectedPropertyIds: string[] (for compare)              │ │
│  │  • isLoading, error                                         │ │
│  │                                                             │ │
│  │  Actions:                                                   │ │
│  │  • fetchProperties()          • updatePropertyStatus()      │ │
│  │  • addProperty()              • setRating()                 │ │
│  │  • updateProperty()           • addNote() / deleteNote()    │ │
│  │  • deleteProperty()           • addPhoto() / addTag()       │ │
│  │  • subscribeToChanges()       • loadDemoData()              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                       clientStore                            │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  State:                                                     │ │
│  │  • clients: Client[]                                        │ │
│  │  • isLoading, error                                         │ │
│  │                                                             │ │
│  │  Actions:                                                   │ │
│  │  • fetchClients()             • linkPropertyToClient()      │ │
│  │  • addClient()                • unlinkPropertyFromClient()  │ │
│  │  • updateClient()             • updateClientProperty()      │ │
│  │  • deleteClient()             • loadDemoData()              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      settingsStore                           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  State:                                                     │ │
│  │  • calculatorDefaults (interest rate, down payment, etc.)   │ │
│  │  • commuteDestinations[]                                    │ │
│  │  • hasAnthropicKey: boolean                                 │ │
│  │  • financialProfile: FinancialProfile                       │ │
│  │                                                             │ │
│  │  Actions:                                                   │ │
│  │  • setCalculatorDefaults()    • saveAnthropicKey()          │ │
│  │  • addCommuteDestination()    • clearAnthropicKey()         │ │
│  │  • setFinancialProfile()      • checkAnthropicKey()         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ACTIONS                              │
│         (Tap, Swipe, Form Submit, Pull to Refresh)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REACT COMPONENTS                            │
│              (Screens, UI Components, Forms)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ZUSTAND STORES                              │
│           (State Updates, Action Dispatching)                    │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│   │ Optimistic  │  │   Local     │  │     Supabase API        │ │
│   │   Update    │──│   Cache     │──│    (Remote Sync)        │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     PostgreSQL                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │households│ │  users   │ │properties│ │property_photos│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ clients  │ │ showings │ │  offers  │ │property_notes │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Realtime Subscriptions                   │  │
│  │           (Live updates for collaborative features)        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         SCREENS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AUTH SCREENS                                                   │
│  ├── OnboardingScreen.tsx   - First-time user intro slides     │
│  ├── LoginScreen.tsx        - Email/password + demo mode       │
│  └── SignUpScreen.tsx       - Account creation                 │
│                                                                  │
│  MAIN SCREENS (Home Buyer)                                      │
│  ├── HomeScreen.tsx         - Property list with filters       │
│  ├── PropertyDetailScreen   - Full property view + AI analysis │
│  ├── AddPropertyScreen.tsx  - Add/edit property form           │
│  ├── MapScreen.tsx          - Map view of properties           │
│  ├── CompareScreen.tsx      - Side-by-side comparison          │
│  ├── CalculatorsScreen.tsx  - Mortgage calculators             │
│  └── SettingsScreen.tsx     - User preferences                 │
│                                                                  │
│  BROKER SCREENS                                                 │
│  ├── DashboardScreen.tsx    - Overview stats & quick actions   │
│  ├── ClientsScreen.tsx      - Client management                │
│  └── ShowingsScreen.tsx     - Showing schedule                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Library

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED COMPONENTS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  UI Components (src/components/ui/)                             │
│  ├── Button.tsx       - Primary/secondary buttons              │
│  ├── Input.tsx        - Text input with labels                 │
│  ├── Card.tsx         - Styled card container                  │
│  ├── Badge.tsx        - Status badges                          │
│  └── StarRating.tsx   - 5-star rating component                │
│                                                                  │
│  Feature Components                                             │
│  ├── Logo.tsx         - App logo + icons                       │
│  ├── DemoBanner.tsx   - Demo mode controls                     │
│  └── AIIntelligence   - AI analysis display                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Library Services

```
┌─────────────────────────────────────────────────────────────────┐
│                     LIBRARY SERVICES                             │
│                      (src/lib/)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ supabase.ts                                                 │ │
│  │ • Supabase client initialization                           │ │
│  │ • Database connection                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ openai.ts (Anthropic Claude)                                │ │
│  │ • Property analysis AI                                      │ │
│  │ • Investment recommendations                                │ │
│  │ • API key management (SecureStore)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ calculators.ts                                              │ │
│  │ • Mortgage payment calculation                              │ │
│  │ • Affordability analysis                                    │ │
│  │ • Closing cost estimation                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ matchScore.ts                                               │ │
│  │ • Property match scoring algorithm                          │ │
│  │ • Buyer preference matching                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ leadScoring.ts                                              │ │
│  │ • Client lead scoring (for brokers)                         │ │
│  │ • Priority ranking                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ demoData.ts + demoMode.ts                                   │ │
│  │ • Sample properties, clients, showings                      │ │
│  │ • Demo mode initialization/cleanup                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ formatters.ts                                               │ │
│  │ • Currency formatting                                       │ │
│  │ • Date formatting                                           │ │
│  │ • Beds/baths display                                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Browser Extension Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                              │
│                   (browser-extension/)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ manifest.json│    │  popup.html  │    │    popup.js      │   │
│  │ (Manifest V3)│    │  (UI)        │    │  (Logic)         │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Content Scripts                          │  │
│  │  ┌─────────────────┐                                      │  │
│  │  │content-redfin.js│  Extracts property data from Redfin  │  │
│  │  └─────────────────┘                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Supabase Integration                    │  │
│  │  ┌─────────────┐                                          │  │
│  │  │ supabase.js │  Direct save to database (when logged in)│  │
│  │  └─────────────┘                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     QR Code Flow                           │  │
│  │  ┌──────────────┐                                         │  │
│  │  │qrcode.min.js │  Generate QR for mobile scanning        │  │
│  │  └──────────────┘                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  DATA EXTRACTION:                                                │
│  • Address, City, State, ZIP                                    │
│  • Price, Beds, Baths, Sqft                                     │
│  • Year Built, Lot Size, HOA                                    │
│  • MLS Number, Listing URL                                      │
│                                                                  │
│  SUPPORTED SITES:                                                │
│  • Redfin (full support)                                        │
│  • Zillow (planned)                                             │
│  • Realtor.com (planned)                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  households                    users                             │
│  ┌─────────────────────┐      ┌─────────────────────────────┐   │
│  │ id (uuid) PK        │      │ id (uuid) PK                │   │
│  │ name                │◄─────│ household_id (FK)           │   │
│  │ invite_code         │      │ email                       │   │
│  │ settings (jsonb)    │      │ name                        │   │
│  │ created_at          │      │ avatar_url                  │   │
│  └─────────────────────┘      │ user_type (individual/broker)   │
│                               │ company_name                │   │
│                               │ preferences (jsonb)         │   │
│                               │ created_at                  │   │
│                               └─────────────────────────────┘   │
│                                                                  │
│  properties                                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ id (uuid) PK              │ sqft, lot_size, year_built     │ │
│  │ household_id (FK)         │ garage, stories, rooms         │ │
│  │ address, city, state, zip │ hoa_monthly, property_tax      │ │
│  │ price                     │ status (interested/toured/...) │ │
│  │ beds, baths               │ property_type, property_style  │ │
│  │ source_url, mls_number    │ interior/exterior_features[]   │ │
│  │ created_by, created_at    │ remarks, directions            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  property_photos         property_ratings       property_notes   │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────┐ │
│  │ id PK            │   │ id PK            │   │ id PK        │ │
│  │ property_id FK   │   │ property_id FK   │   │ property_id  │ │
│  │ url              │   │ user_id FK       │   │ user_id FK   │ │
│  │ caption          │   │ rating (1-5)     │   │ content      │ │
│  │ is_primary       │   │ created_at       │   │ type (pro/   │ │
│  │ uploaded_by      │   └──────────────────┘   │   con/general│ │
│  └──────────────────┘                          └──────────────┘ │
│                                                                  │
│  clients (broker)            client_properties                   │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐ │
│  │ id PK                │   │ id PK                            │ │
│  │ name, email, phone   │◄──│ client_id FK                     │ │
│  │ status (active/...)  │   │ property_id FK                   │ │
│  │ budget_min/max       │   │ status (interested/shown/...)    │ │
│  │ preferred_beds/baths │   │ shown_date, feedback, rating     │ │
│  │ timeline, pre_approved│  └──────────────────────────────────┘ │
│  │ created_by FK        │                                        │
│  │ household_id FK      │   showings                             │
│  └──────────────────────┘   ┌──────────────────────────────────┐ │
│                             │ id PK                            │ │
│                             │ property_id FK                   │ │
│                             │ client_id FK                     │ │
│                             │ scheduled_date, scheduled_time   │ │
│                             │ duration_minutes, status         │ │
│                             │ notes, feedback, rating          │ │
│                             └──────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Integration (Anthropic Claude)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ANALYSIS FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   USER                HOMESCOUT APP              ANTHROPIC API   │
│    │                       │                          │          │
│    │  View Property        │                          │          │
│    │──────────────────────>│                          │          │
│    │                       │                          │          │
│    │  Tap "AI Analysis"    │                          │          │
│    │──────────────────────>│                          │          │
│    │                       │                          │          │
│    │                       │  Send Property Data +    │          │
│    │                       │  Financial Profile       │          │
│    │                       │─────────────────────────>│          │
│    │                       │                          │          │
│    │                       │  Structured Analysis:    │          │
│    │                       │  • Affordability Score   │          │
│    │                       │  • Investment Rating     │          │
│    │                       │  • Pros/Cons             │          │
│    │                       │  • Recommendations       │          │
│    │                       │<─────────────────────────│          │
│    │                       │                          │          │
│    │  Display Analysis     │                          │          │
│    │<──────────────────────│                          │          │
│    │                       │                          │          │
│                                                                  │
│  ANALYSIS INCLUDES:                                              │
│  ├── Affordability Assessment (based on income, DTI)            │
│  ├── Investment Potential (appreciation, rental yield)          │
│  ├── Lifestyle Fit (commute, schools, amenities)                │
│  ├── Negotiation Tips (market conditions, days on market)       │
│  └── Couple Compatibility (both partners' preferences)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flows

### Home Buyer Flow
```
┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────────┐
│Onboarding│──>│  Login   │──>│ Properties│──>│   Detail    │
└─────────┘   └──────────┘   └───────────┘   └─────────────┘
                                   │               │
                                   │               ├──> Rate & Note
                                   │               ├──> AI Analysis
                                   │               └──> Make Offer
                                   │
                                   ├──────────────────> Compare
                                   ├──────────────────> Map View
                                   └──────────────────> Calculators
```

### Broker Flow
```
┌─────────┐   ┌──────────┐   ┌───────────┐
│  Login  │──>│Dashboard │──>│  Clients  │
└─────────┘   └──────────┘   └───────────┘
                   │               │
                   │               ├──> Add Client
                   │               ├──> Link Property
                   │               └──> Track Status
                   │
                   ├──────────────────> Showings
                   │                       │
                   │                       ├──> Schedule
                   │                       └──> Record Feedback
                   │
                   └──────────────────> Properties
```

---

## File Structure

```
HomeScout/
├── App.tsx                    # Root component
├── index.ts                   # Entry point
├── app.json                   # Expo configuration
├── package.json               # Dependencies
│
├── src/
│   ├── navigation/
│   │   └── index.tsx          # Navigation configuration
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── OnboardingScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SignUpScreen.tsx
│   │   │
│   │   ├── HomeScreen.tsx
│   │   ├── PropertyDetailScreen.tsx
│   │   ├── AddPropertyScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── CompareScreen.tsx
│   │   ├── CalculatorsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ClientsScreen.tsx
│   │   └── ShowingsScreen.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── StarRating.tsx
│   │   │
│   │   ├── Logo.tsx
│   │   ├── DemoBanner.tsx
│   │   └── AIIntelligence.tsx
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── propertyStore.ts
│   │   ├── clientStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── openai.ts
│   │   ├── calculators.ts
│   │   ├── matchScore.ts
│   │   ├── leadScoring.ts
│   │   ├── formatters.ts
│   │   ├── demoData.ts
│   │   └── demoMode.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── constants/
│       └── theme.ts
│
├── browser-extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content-redfin.js
│   ├── supabase.js
│   └── icons/
│
└── landing-page/
    ├── index.html
    └── styles.css
```

---

## Security Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AUTHENTICATION                                                  │
│  • Supabase Auth with JWT tokens                                │
│  • Google OAuth integration                                      │
│  • Session management with secure refresh                        │
│                                                                  │
│  DATA PROTECTION                                                 │
│  • Row Level Security (RLS) on all Supabase tables              │
│  • Household-based data isolation                                │
│  • API keys stored in Expo SecureStore                          │
│                                                                  │
│  API SECURITY                                                    │
│  • Anthropic API key stored securely (not in code)              │
│  • Supabase anon key for client-side access                     │
│  • HTTPS for all API communications                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*Generated for HomeScout v1.0.0*
