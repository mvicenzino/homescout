/**
 * Demo Mode Initialization
 *
 * This module handles loading demo data into all stores when demo mode is activated.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePropertyStore } from '../store/propertyStore';
import { useClientStore } from '../store/clientStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  demoFinancialProfile,
  demoShowings,
  demoActivities,
  demoOffers,
  demoHousehold,
} from './demoData';

/**
 * Initialize demo mode by loading all demo data into stores
 */
export async function initializeDemoMode(userType: 'buyer' | 'broker'): Promise<void> {
  // Load demo properties
  usePropertyStore.getState().loadDemoData();

  // Load demo clients (for broker view)
  useClientStore.getState().loadDemoData();

  // Load demo financial profile
  useSettingsStore.getState().setFinancialProfile(demoFinancialProfile);

  // Load demo commute destinations
  const settingsStore = useSettingsStore.getState();
  if (demoHousehold.settings.commute_destinations) {
    for (const dest of demoHousehold.settings.commute_destinations) {
      settingsStore.addCommuteDestination(dest);
    }
  }

  // Load demo showings into AsyncStorage
  try {
    await AsyncStorage.setItem('showings', JSON.stringify(demoShowings));
  } catch (error) {
    console.error('Error loading demo showings:', error);
  }

  // Load demo activities into AsyncStorage
  try {
    await AsyncStorage.setItem('activities', JSON.stringify(demoActivities));
    // Also save property-specific activities
    for (const activity of demoActivities) {
      const key = `activities_${activity.property_id}`;
      const existing = await AsyncStorage.getItem(key);
      const activities = existing ? JSON.parse(existing) : [];
      activities.push(activity);
      await AsyncStorage.setItem(key, JSON.stringify(activities));
    }
  } catch (error) {
    console.error('Error loading demo activities:', error);
  }

  // Load demo offers into AsyncStorage
  try {
    for (const offer of demoOffers) {
      const key = `offers_${offer.property_id}`;
      const existing = await AsyncStorage.getItem(key);
      const offers = existing ? JSON.parse(existing) : [];
      offers.push(offer);
      await AsyncStorage.setItem(key, JSON.stringify(offers));
    }
  } catch (error) {
    console.error('Error loading demo offers:', error);
  }

  console.log(`Demo mode initialized for ${userType}`);
}

/**
 * Clear all demo data when exiting demo mode
 */
export async function clearDemoMode(): Promise<void> {
  // Clear demo data from stores
  usePropertyStore.getState().clearDemoData();
  useClientStore.getState().clearDemoData();
  useSettingsStore.getState().clearFinancialProfile();

  // Clear demo data from AsyncStorage
  try {
    const keys = await AsyncStorage.getAllKeys();
    const demoKeys = keys.filter(
      (key) =>
        key.startsWith('showings') ||
        key.startsWith('activities') ||
        key.startsWith('offers_demo-prop') ||
        key.startsWith('tour_checklist_demo-prop') ||
        key.startsWith('negotiation_demo-prop') ||
        key.startsWith('neighborhood_demo-prop') ||
        key.startsWith('couple_analysis_demo-prop')
    );
    await AsyncStorage.multiRemove(demoKeys);
  } catch (error) {
    console.error('Error clearing demo data:', error);
  }

  console.log('Demo mode cleared');
}
