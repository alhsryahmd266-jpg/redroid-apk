import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TOOLS } from '@/constants/tools';
import { C } from '@/constants/colors';
import { ToolCard } from '@/components/ToolCard';

const CATEGORIES = ['All', 'Static', 'Dynamic', 'Network', 'Forensics', 'Root', 'Framework'];

const AnimatedToolCard = ({ tool, onPress }: { tool: any, onPress: () => void }) => {
  const scale = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <ToolCard 
        tool={tool} 
        onPress={() => {
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    </Animated.View>
  );
};

export default function ToolsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTools = TOOLS.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) || 
                         tool.tagline.toLowerCase().includes(search.toLowerCase()) ||
                         tool.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الأدوات الاحترافية</Text>
        <Text style={styles.headerSub}>مكتبة شاملة للهندسة العكسية واختبار الأمان</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={C.green} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن أداة (JADX, Frida...)"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filtersWrapper}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.filterChip,
                activeCategory === item && styles.filterChipActive
              ]}
              onPress={() => setActiveCategory(item)}
            >
              <Text style={[
                styles.filterText,
                activeCategory === item && styles.filterTextActive
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      <View style={styles.countContainer}>
        <Text style={styles.countText}>تم العثور على {filteredTools.length} أداة</Text>
      </View>

      <FlatList
        data={filteredTools}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnimatedToolCard 
            tool={item} 
            onPress={() => router.push(`/tool/${item.id}`)} 
          />
        )}
        contentContainerStyle={styles.listContent}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="slash" size={48} color={C.textMuted} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>لم يتم العثور على نتائج للبحث المكتوب.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.text,
  },
  headerSub: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 16,
    textAlign: 'right',
  },
  filtersWrapper: {
    marginBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: C.surfaceAlt,
    marginRight: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: C.green,
  },
  filterText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: C.green,
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    color: C.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
