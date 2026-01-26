import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnthropicApiKey, setAnthropicApiKey, removeAnthropicApiKey } from '../lib/openai';
import { supabase } from '../lib/supabase';
import type { FinancialProfile } from '../types';

interface CalculatorDefaults {
  interestRate: number;
  downPaymentPercent: number;
  loanTermYears: number;
  propertyTaxRate: number; // Annual as % of home value
  insuranceRate: number; // Annual as % of home value
}

interface SettingsState {
  calculatorDefaults: CalculatorDefaults;
  commuteDestinations: Array<{ name: string; address: string }>;
  hasAnthropicKey: boolean;
  financialProfile: FinancialProfile;

  // Actions
  setCalculatorDefaults: (defaults: Partial<CalculatorDefaults>) => void;
  addCommuteDestination: (destination: { name: string; address: string }) => void;
  removeCommuteDestination: (index: number) => void;
  updateCommuteDestination: (index: number, destination: { name: string; address: string }) => void;
  checkAnthropicKey: () => Promise<void>;
  saveAnthropicKey: (key: string) => Promise<{ error?: string }>;
  clearAnthropicKey: () => Promise<void>;
  setFinancialProfile: (profile: Partial<FinancialProfile>) => void;
  clearFinancialProfile: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      calculatorDefaults: {
        interestRate: 6.5,
        downPaymentPercent: 20,
        loanTermYears: 30,
        propertyTaxRate: 1.2,
        insuranceRate: 0.35,
      },
      commuteDestinations: [],
      hasAnthropicKey: false,
      financialProfile: {},

      setCalculatorDefaults: (defaults) => {
        set((state) => ({
          calculatorDefaults: { ...state.calculatorDefaults, ...defaults },
        }));
      },

      addCommuteDestination: (destination) => {
        set((state) => ({
          commuteDestinations: [...state.commuteDestinations, destination],
        }));
      },

      removeCommuteDestination: (index) => {
        set((state) => ({
          commuteDestinations: state.commuteDestinations.filter((_, i) => i !== index),
        }));
      },

      updateCommuteDestination: (index, destination) => {
        set((state) => ({
          commuteDestinations: state.commuteDestinations.map((d, i) =>
            i === index ? destination : d
          ),
        }));
      },

      checkAnthropicKey: async () => {
        // First check local storage
        let key = await getAnthropicApiKey();

        // If no local key, try to fetch from Supabase
        if (!key) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: user } = await supabase
                .from('users')
                .select('preferences')
                .eq('id', session.user.id)
                .single();

              const cloudKey = user?.preferences?.anthropic_api_key;
              if (cloudKey) {
                // Sync cloud key to local storage
                await setAnthropicApiKey(cloudKey);
                key = cloudKey;
              }
            }
          } catch (error) {
            console.log('Error fetching API key from cloud:', error);
          }
        }

        set({ hasAnthropicKey: !!key });
      },

      saveAnthropicKey: async (key: string) => {
        try {
          // Save to local secure storage
          await setAnthropicApiKey(key);

          // Also save to Supabase for cross-device sync
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: user } = await supabase
              .from('users')
              .select('preferences')
              .eq('id', session.user.id)
              .single();

            const updatedPreferences = {
              ...(user?.preferences || {}),
              anthropic_api_key: key,
            };

            await supabase
              .from('users')
              .update({ preferences: updatedPreferences })
              .eq('id', session.user.id);
          }

          set({ hasAnthropicKey: true });
          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      clearAnthropicKey: async () => {
        await removeAnthropicApiKey();

        // Also clear from Supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: user } = await supabase
              .from('users')
              .select('preferences')
              .eq('id', session.user.id)
              .single();

            const updatedPreferences = { ...(user?.preferences || {}) };
            delete updatedPreferences.anthropic_api_key;

            await supabase
              .from('users')
              .update({ preferences: updatedPreferences })
              .eq('id', session.user.id);
          }
        } catch (error) {
          console.log('Error clearing API key from cloud:', error);
        }

        set({ hasAnthropicKey: false });
      },

      setFinancialProfile: (profile) => {
        set((state) => ({
          financialProfile: { ...state.financialProfile, ...profile },
        }));
      },

      clearFinancialProfile: () => {
        set({ financialProfile: {} });
      },
    }),
    {
      name: 'homescout-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
