import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface BadgeProps {
  label: string;
  colors: { bg: string; fg: string };
  small?: boolean;
  medium?: boolean;
  large?: boolean;
  icon?: keyof typeof Feather.glyphMap;
}

export const Badge = ({ label, colors, small, medium, large, icon }: BadgeProps) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const sizeStyle = large ? styles.largeBadge : (medium ? styles.mediumBadge : (small ? styles.smallBadge : styles.mediumBadge));
  const textSizeStyle = large ? styles.largeText : (medium ? styles.mediumText : (small ? styles.smallText : styles.mediumText));
  const iconSize = large ? 16 : (medium ? 14 : (small ? 12 : 14));

  return (
    <Animated.View 
      style={[
        styles.badge, 
        { backgroundColor: colors.bg, transform: [{ scale: scaleAnim }] }, 
        sizeStyle
      ]}
    >
      {icon && (
        <Feather name={icon} size={iconSize} color={colors.fg} style={styles.icon} />
      )}
      <Text style={[styles.text, { color: colors.fg }, textSizeStyle]}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  largeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    fontWeight: '700',
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
  icon: {
    marginRight: 4,
  },
});
