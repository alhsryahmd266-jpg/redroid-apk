import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COMMAND_GROUPS } from '@/constants/commands';
import { C } from '@/constants/colors';
import { CodeBlock } from '@/components/CodeBlock';

export default function ReferenceScreen() {
  const [search, setSearch] = useState('');

  const filteredGroups = COMMAND_GROUPS.map(group => ({
    ...group,
    commands: group.commands.filter(cmd => 
      cmd.cmd.toLowerCase().includes(search.toLowerCase()) || 
      cmd.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.commands.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={C.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search commands..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredGroups.map((group, index) => (
          <View key={index} style={styles.group}>
            <View style={styles.groupHeader}>
              <Feather name="terminal" size={16} color={C.green} />
              <Text style={styles.groupTitle}>{group.tool}</Text>
            </View>
            
            {group.commands.map((cmd, cmdIndex) => (
              <View key={cmdIndex} style={styles.commandItem}>
                <Text style={styles.commandDesc}>{cmd.desc}</Text>
                <CodeBlock code={cmd.cmd} />
              </View>
            ))}
          </View>
        ))}

        {filteredGroups.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No commands found.</Text>
          </View>
        )}
      </ScrollView>
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
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  group: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  groupTitle: {
    color: C.green,
    fontSize: 18,
    fontWeight: 'bold',
  },
  commandItem: {
    marginBottom: 16,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  commandDesc: {
    color: C.text,
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.9,
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
