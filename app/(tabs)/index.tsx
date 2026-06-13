import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TOOLS } from '@/constants/tools';
import { C } from '@/constants/colors';
import { ToolCard } from '@/components/ToolCard';

export default function HomeScreen() {
  const router = useRouter();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const featuredTools = TOOLS.slice(0, 4);

  const paths = [
    { title: 'Static Analysis', icon: 'file-text', color: C.blue },
    { title: 'Dynamic Analysis', icon: 'activity', color: C.green },
    { title: 'Network Analysis', icon: 'globe', color: C.purple },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.title}>REDroid</Text>
          </View>
          <Text style={styles.subtitle}>Professional Reverse Engineering Toolkit</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statLabel}>Tools</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>10</Text>
            <Text style={styles.statLabel}>Techniques</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>Pro</Text>
            <Text style={styles.statLabel}>Grade</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Tools</Text>
            <TouchableOpacity onPress={() => router.push('/tools')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {featuredTools.map(tool => (
            <ToolCard 
              key={tool.id} 
              tool={tool} 
              onPress={() => router.push(`/tool/${tool.id}`)} 
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Paths</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pathsScroll}>
            {paths.map((path, index) => (
              <View key={index} style={[styles.pathCard, { borderColor: path.color + '40' }]}>
                <Feather name={path.icon as any} size={24} color={path.color} />
                <Text style={styles.pathTitle}>{path.title}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.red,
    marginRight: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: C.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: C.green,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: C.border,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.text,
  },
  seeAll: {
    color: C.green,
    fontSize: 14,
  },
  pathsScroll: {
    marginTop: 8,
  },
  pathCard: {
    backgroundColor: C.surface,
    padding: 20,
    borderRadius: 16,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    alignItems: 'center',
  },
  pathTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
