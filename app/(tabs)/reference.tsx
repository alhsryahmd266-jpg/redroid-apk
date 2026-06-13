import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COMMAND_GROUPS } from '@/constants/commands';
import { C } from '@/constants/colors';
import { CodeBlock } from '@/components/CodeBlock';

const CommandItem = ({ cmd }: { cmd: { cmd: string, desc: string } }) => {
  return (
    <View style={styles.commandItem}>
      <Text style={styles.commandDesc}>{cmd.desc}</Text>
      <CodeBlock code={cmd.cmd} />
    </View>
  );
};

export default function ReferenceScreen() {
  const [search, setSearch] = useState('');

  const filteredGroups = COMMAND_GROUPS.map(group => ({
    ...group,
    commands: group.commands.filter(cmd => 
      cmd.cmd.toLowerCase().includes(search.toLowerCase()) || 
      cmd.desc.toLowerCase().includes(search.toLowerCase()) ||
      group.tool.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.commands.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مرجع الأوامر السريع</Text>
        <Text style={styles.headerSub}>أهم أوامر الأدوات مع شرح باللغة العربية</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="terminal" size={20} color={C.green} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن أمر أو أداة..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          }}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredGroups.map((group, index) => (
          <View key={index} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={styles.groupIcon}>
                <Feather name="box" size={14} color={C.bg} />
              </View>
              <Text style={styles.groupTitle}>{group.tool}</Text>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{group.commands.length}</Text>
              </View>
            </View>
            
            <View style={styles.groupContent}>
              {group.commands.map((cmd, cmdIndex) => (
                <CommandItem key={cmdIndex} cmd={cmd} />
              ))}
            </View>
          </View>
        ))}

        {filteredGroups.length === 0 && (
          <View style={styles.empty}>
            <Feather name="search" size={48} color={C.border} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>لا توجد أوامر تطابق بحثك.</Text>
          </View>
        )}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8E8F0',
  },
  headerSub: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    height: 50,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    color: '#E8E8F0',
    fontSize: 16,
    paddingRight: 12,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  group: {
    marginBottom: 28,
  },
  groupHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  groupIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    color: '#00FF88',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  groupBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupBadgeText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  groupContent: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  commandItem: {
    marginBottom: 20,
  },
  commandDesc: {
    color: '#E8E8F0',
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.9,
    textAlign: 'right',
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 16,
  },
});
