import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  colors: { bg: string; fg: string };
  small?: boolean;
}

export const Badge = ({ label, colors, small }: BadgeProps) => {
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, small && styles.smallBadge]}>
      <Text style={[styles.text, { color: colors.fg }, small && styles.smallText]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
});
