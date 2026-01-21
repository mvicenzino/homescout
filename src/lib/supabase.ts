import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase project credentials
const SUPABASE_URL = 'https://zqesezyxcsedtexpvyfq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXNlenl4Y3NlZHRleHB2eWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDI4MTEsImV4cCI6MjA4MzAxODgxMX0.-aYLgU6Ag3sFydd9sNso6y778eci5Jh3lbbvLoKMif0';

// Custom storage adapter using AsyncStorage for reliable session persistence
// AsyncStorage handles larger data than SecureStore (which has 2KB limit)
const AsyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore errors
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase is configured
export const isSupabaseConfigured = true;
