import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Tool } from '@/constants/tools';
import { C, TAG_COLORS, LEVEL_COLORS } from '@/constants/colors';
import { Badge } from './Badge';

interface ToolCardProps {
  tool: Tool;
  onPress: () => void;
}

export const ToolCard = ({ tool, onPress }: ToolCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.name}>{tool.name}</Text>
        <View style={styles.starsContainer}>
          <Feather name="star" size={14} color={C.gold} />
          <Text style={styles.stars}>{tool.stars}</Text>
        </View>
      </View>
      
      <Text style={styles.tagline} numberOfLines={1}>{tool.tagline}</Text>
      
      <View style={styles.footer}>
        <View style={styles.badges}>
          <Badge label={tool.category} colors={TAG_COLORS[tool.category]} small />
          <View style={{ width: 8 }} />
          <Badge label={tool.level} colors={LEVEL_COLORS[tool.level]} small />
        </View>
        <Feather name="chevron-right" size={20} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: C.green,
    fontSize: 18,
    fontWeight: 'bold',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    color: C.gold,
    fontSize: 12,
    marginLeft: 4,
  },
  tagline: {
    color: C.text,
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
  },
});
