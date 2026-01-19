import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { colors } from '../constants/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export function Logo({ size = 72, showText = false, textColor = colors.textPrimary }: LogoProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.logoWrapper, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* Background circle */}
          <Circle cx="60" cy="60" r="56" fill="#2563EB" />

          {/* House shape */}
          <Path
            d="M60 25L30 50V85C30 87.2 31.8 89 34 89H50V67C50 64.8 51.8 63 54 63H66C68.2 63 70 64.8 70 67V89H86C88.2 89 90 87.2 90 85V50L60 25Z"
            fill="white"
          />

          {/* Roof accent */}
          <Path
            d="M60 25L30 50L36 50L60 31L84 50L90 50L60 25Z"
            fill="#1D4ED8"
          />

          {/* Magnifying glass circle */}
          <Circle cx="60" cy="55" r="10" fill="#2563EB" stroke="white" strokeWidth="3" />

          {/* Magnifying glass handle */}
          <Line x1="67" y1="62" x2="74" y2="69" stroke="white" strokeWidth="3" strokeLinecap="round" />

          {/* Heart */}
          <Path
            d="M60 76C60 76 52 70 52 66C52 63.5 54 62 56.5 62C58.5 62 60 63.5 60 65C60 63.5 61.5 62 63.5 62C66 62 68 63.5 68 66C68 70 60 76 60 76Z"
            fill="#EF4444"
          />
        </Svg>
      </View>
      {showText && (
        <Text style={[styles.logoText, { color: textColor }]}>HomeScout</Text>
      )}
    </View>
  );
}

// Simpler icon versions for feature cards
interface FeatureIconProps {
  type: 'home' | 'heart' | 'sparkle' | 'phone' | 'compare' | 'calculator';
  size?: number;
}

export function FeatureIcon({ type, size = 56 }: FeatureIconProps) {
  const iconContent = {
    home: (
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path
          d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          fill="white"
        />
        <Path d="M9 22V12h6v10" fill="#2563EB" />
      </Svg>
    ),
    heart: (
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path
          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
          fill="white"
        />
      </Svg>
    ),
    sparkle: (
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="white"
        />
      </Svg>
    ),
    phone: (
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path
          d="M17 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V4C19 2.9 18.1 2 17 2ZM12 20C11.45 20 11 19.55 11 19C11 18.45 11.45 18 12 18C12.55 18 13 18.45 13 19C13 19.55 12.55 20 12 20ZM17 17H7V5H17V17Z"
          fill="white"
        />
      </Svg>
    ),
    compare: (
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path d="M10 3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H10V3Z" fill="white" />
        <Path d="M14 3H20C21.1 3 22 3.9 22 5V19C22 20.1 21.1 21 20 21H14V3Z" fill="rgba(255,255,255,0.7)" />
        <Path d="M12 7V17" stroke="#2563EB" strokeWidth="2" />
      </Svg>
    ),
    calculator: (
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path
          d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM7 17H5V15H7V17ZM7 13H5V11H7V13ZM11 17H9V15H11V17ZM11 13H9V11H11V13ZM15 17H13V11H15V17ZM19 17H17V15H19V17ZM19 13H17V11H19V13ZM19 9H5V5H19V9Z"
          fill="white"
        />
      </Svg>
    ),
  };

  return (
    <View style={[styles.featureIconContainer, { width: size, height: size, borderRadius: size * 0.28 }]}>
      {iconContent[type]}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoWrapper: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  featureIconContainer: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
