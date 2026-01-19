import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../../constants/theme';
import { PropertyStatus } from '../../types';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'purple';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], styles[size], style]}>
      <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
        {label}
      </Text>
    </View>
  );
}

// Helper to get badge variant for property status
export function getStatusBadgeVariant(status: PropertyStatus): BadgeProps['variant'] {
  switch (status) {
    case 'interested':
      return 'primary';
    case 'toured':
      return 'purple';
    case 'offer_made':
      return 'warning';
    case 'under_contract':
      return 'success';
    case 'rejected':
      return 'error';
    case 'purchased':
      return 'success';
    default:
      return 'default';
  }
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },

  // Sizes
  sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  // Variants
  default: {
    backgroundColor: colors.surfaceSecondary,
  },
  primary: {
    backgroundColor: colors.primaryLight + '20',
  },
  success: {
    backgroundColor: colors.success + '20',
  },
  warning: {
    backgroundColor: colors.warning + '20',
  },
  error: {
    backgroundColor: colors.error + '20',
  },
  purple: {
    backgroundColor: '#8B5CF6' + '20',
  },

  // Text
  text: {
    fontWeight: fontWeight.medium,
  },
  smText: {
    fontSize: fontSize.xs,
  },
  mdText: {
    fontSize: fontSize.sm,
  },

  // Text colors
  defaultText: {
    color: colors.textSecondary,
  },
  primaryText: {
    color: colors.primary,
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
  errorText: {
    color: colors.error,
  },
  purpleText: {
    color: '#8B5CF6',
  },
});
