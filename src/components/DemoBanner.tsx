import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

export function DemoBanner() {
  const { isDemoMode, user, signOut, signInAsDemo } = useAuthStore();

  if (!isDemoMode) return null;

  const isBroker = user?.user_type === 'broker';

  const handleSwitchMode = async () => {
    // Sign out first, then sign in as the other type
    await signOut();
    await signInAsDemo(isBroker ? 'buyer' : 'broker');
  };

  const handleExitDemo = async () => {
    await signOut();
  };

  return (
    <LinearGradient
      colors={['#F59E0B', '#D97706']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <Text style={styles.demoLabel}>DEMO</Text>
            <TouchableOpacity style={styles.toggleButton} onPress={handleSwitchMode}>
              <View style={[styles.toggleOption, !isBroker && styles.toggleOptionActive]}>
                <Text style={[styles.toggleText, !isBroker && styles.toggleTextActive]}>Buyer</Text>
              </View>
              <View style={[styles.toggleOption, isBroker && styles.toggleOptionActive]}>
                <Text style={[styles.toggleText, isBroker && styles.toggleTextActive]}>Pro</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitDemo}>
            <Text style={styles.exitButtonText}>Exit Demo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  safeArea: {
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demoLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  toggleButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    padding: 2,
  },
  toggleOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  toggleOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: 'rgba(255,255,255,0.9)',
  },
  toggleTextActive: {
    color: '#B45309',
    fontWeight: fontWeight.semibold,
  },
  exitButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  exitButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: '#FFFFFF',
  },
});
