import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TOOLS } from '@/constants/tools';
import { C } from '@/constants/colors';
import { ToolCard } from '@/components/ToolCard';

const CATEGORIES = ['All', 'Static', 'Dynamic', 'Network', 'Forensics', 'Root', 'Framework'];

export default function ToolsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTools = TOOLS.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) || 
                         tool.tagline.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={C.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tools..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterBadge,
                activeCategory === item && styles.filterBadgeActive
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

      <FlatList
        data={filteredTools}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ToolCard 
            tool={item} 
            onPress={() => router.push(`/tool/${item.id}`)} 
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tools found matching your criteria.</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: C.text,
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterBadgeActive: {
    backgroundColor: C.greenMuted,
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
  listContent: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 16,
  },
});
