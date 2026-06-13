import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { TECHNIQUES, Technique } from '@/constants/techniques';
import { C, LEVEL_COLORS } from '@/constants/colors';
import { Badge } from '@/components/Badge';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TechniqueItem = ({ technique }: { technique: Technique }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.item, expanded && styles.itemExpanded]}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{technique.title}</Text>
          <Badge label={technique.difficulty} colors={LEVEL_COLORS[technique.difficulty]} small />
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={C.textMuted} />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          <Text style={styles.description}>{technique.description}</Text>
          
          <Text style={styles.sectionLabel}>Steps:</Text>
          {technique.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          
          <View style={styles.footer}>
            <Text style={styles.toolsLabel}>Tools: </Text>
            <Text style={styles.toolsText}>{technique.tools.join(' + ')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default function TechniquesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Workflow & Techniques</Text>
          <Text style={styles.introSub}>Step-by-step guides for professional analysis</Text>
        </View>

        {TECHNIQUES.map(tech => (
          <TechniqueItem key={tech.id} technique={tech} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    padding: 16,
  },
  intro: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.text,
  },
  introSub: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  item: {
    backgroundColor: C.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  itemExpanded: {
    borderColor: C.greenDim,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.text,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  description: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 16,
    opacity: 0.8,
  },
  sectionLabel: {
    color: C.green,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    color: C.green,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
  },
  toolsLabel: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  toolsText: {
    color: C.blue,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
