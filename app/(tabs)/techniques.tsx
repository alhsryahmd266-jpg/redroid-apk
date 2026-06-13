import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { TECHNIQUES, Technique } from '@/constants/techniques';
import { C } from '@/constants/colors';
import { Badge } from '@/components/Badge';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DIFFICULTY_COLORS = {
  Beginner: { bg: 'rgba(0, 255, 136, 0.1)', fg: '#00FF88' },
  Advanced: { bg: 'rgba(255, 215, 0, 0.1)', fg: '#FFD700' },
  Expert: { bg: 'rgba(255, 68, 68, 0.1)', fg: '#FF4444' },
};

const TechniqueItem = ({ technique }: { technique: Technique }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const diffColors = DIFFICULTY_COLORS[technique.difficulty];

  return (
    <View style={[styles.item, expanded && styles.itemExpanded]}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={[styles.indicator, { backgroundColor: diffColors.fg }]} />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>{technique.title}</Text>
            <Text style={styles.category}>{technique.category}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Badge label={technique.difficulty} colors={diffColors} small />
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={C.textMuted} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          <Text style={styles.description}>{technique.description}</Text>
          
          <View style={styles.sectionHeader}>
            <Feather name="list" size={16} color={C.green} />
            <Text style={styles.sectionLabel}>الخطوات العملية (Steps):</Text>
          </View>

          {technique.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: 'rgba(0, 255, 136, 0.1)' }]}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          
          <View style={styles.toolsBox}>
            <View style={styles.toolsHeader}>
              <Feather name="tool" size={14} color={C.blue} />
              <Text style={styles.toolsLabel}>الأدوات المطلوبة:</Text>
            </View>
            <View style={styles.toolsList}>
              {technique.tools.map((tool, idx) => (
                <View key={idx} style={styles.toolBadge}>
                  <Text style={styles.toolBadgeText}>{tool}</Text>
                </View>
              ))}
            </View>
          </View>

          {technique.notes && (
            <View style={styles.noteBox}>
              <Feather name="info" size={14} color={C.gold} />
              <Text style={styles.noteText}><Text style={{ fontWeight: 'bold' }}>ملاحظة: </Text>{technique.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default function TechniquesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>التقنيات وخطوات العمل</Text>
          <Text style={styles.introSub}>دليل شامل للمنهجيات الاحترافية في التحليل</Text>
        </View>

        {TECHNIQUES.map(tech => (
          <TechniqueItem key={tech.id} technique={tech} />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  scrollContent: {
    padding: 16,
  },
  intro: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8E8F0',
  },
  introSub: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: 6,
  },
  item: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  itemExpanded: {
    borderColor: 'rgba(0, 255, 136, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  header: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#E8E8F0',
  },
  category: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: 18,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  description: {
    color: 'rgba(232, 232, 240, 0.7)',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionLabel: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepRow: {
    flexDirection: 'row-reverse',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: '#E8E8F0',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
  },
  toolsBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  toolsLabel: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  toolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toolBadgeText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  noteBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 10,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  noteText: {
    flex: 1,
    color: '#FFD700',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
});
