import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnthropicApiKey, setAnthropicApiKey, removeAnthropicApiKey } from '../lib/openai';
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
        const key = await getAnthropicApiKey();
        set({ hasAnthropicKey: !!key });
      },

      saveAnthropicKey: async (key: string) => {
        try {
          await setAnthropicApiKey(key);
          set({ hasAnthropicKey: true });
          return {};
        } catch (error: any) {
          return { error: error.message };
        }
      },

      clearAnthropicKey: async () => {
        await removeAnthropicApiKey();
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
