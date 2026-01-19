import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors, spacing, fontSize } from '../../constants/theme';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
  showLabel?: boolean;
  color?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  editable = false,
  onRatingChange,
  showLabel = false,
  color = colors.warning,
}: StarRatingProps) {
  const starSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };
  const starSize = starSizes[size];

  const handlePress = (index: number) => {
    if (editable && onRatingChange) {
      // Toggle off if clicking same star
      const newRating = rating === index + 1 ? 0 : index + 1;
      onRatingChange(newRating);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {Array.from({ length: maxRating }, (_, index) => {
          const isFilled = index < rating;
          const Star = editable ? TouchableOpacity : View;

          return (
            <Star
              key={index}
              onPress={() => handlePress(index)}
              style={[styles.star, { width: starSize, height: starSize }]}
            >
              <Text style={{ fontSize: starSize - 4, color: isFilled ? color : colors.border }}>
                {isFilled ? '\u2605' : '\u2606'}
              </Text>
            </Star>
          );
        })}
      </View>
      {showLabel && rating > 0 && (
        <Text style={styles.label}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
