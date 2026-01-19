# HomeScout Setup Guide

A personal iOS app for couples house hunting together.

## Quick Start

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor** and run the schema from `supabase/migrations/001_initial_schema.sql`
3. Go to **Project Settings > API** and copy:
   - Project URL
   - anon/public key

4. Update `src/lib/supabase.ts` with your credentials:
```typescript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

5. Enable **Email Auth** in Authentication > Providers

### 2. Run the App

#### Option A: Expo Go (Easiest - Recommended to Start)

1. Install Expo Go on your iPhones from the App Store
2. Run the dev server:
```bash
cd ~/Documents/GitHub/HomeScout
npm start
```
3. Scan the QR code with your iPhone camera
4. Both you and your wife can use the same QR code on different phones

#### Option B: Development Build (For Full Features)

Development builds include native modules like camera access:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create development build for iOS
eas build --profile development --platform ios

# Install on your device via QR code
```

#### Option C: TestFlight (Internal Distribution)

For a more "app-like" experience:

```bash
# Create a preview build
eas build --profile preview --platform ios

# Submit to TestFlight (requires Apple Developer account)
eas submit --platform ios
```

## First Launch

1. Open the app
2. **First user (you)**: Create account → Create Household
3. **Second user (wife)**: Create account → Enter invite code from step 2
4. Both accounts are now linked and will see the same properties!

## Features

- **Add Properties**: Tap + to add homes you're interested in
- **Rate Properties**: Both partners rate 1-5 stars independently
- **Notes**: Add pros, cons, and general notes
- **Tags**: Organize with custom tags like "Great Backyard"
- **Compare**: Select 2 properties to compare side-by-side
- **Calculators**:
  - Mortgage payment calculator
  - True cost (PITI + HOA)
  - Affordability calculator

## Real-Time Sync

Changes sync automatically between devices. When your wife rates a property, you'll see it update instantly.

## Offline Support

The app caches properties locally so you can browse even without internet. Changes sync when you're back online.

## Troubleshooting

**"Supabase not configured" error**
- Make sure you updated `src/lib/supabase.ts` with your project credentials

**Can't join household**
- Invite codes are case-insensitive
- Check the code is correct in Settings

**Photos not uploading**
- Expo Go has limited photo access; use a Development Build for full features

## Tech Stack

- React Native + Expo
- TypeScript
- Supabase (auth, database, real-time)
- Zustand (state management)
