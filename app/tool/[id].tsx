import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { TOOLS } from '@/constants/tools';
import { C, TAG_COLORS, LEVEL_COLORS } from '@/constants/colors';
import { Badge } from '@/components/Badge';

export default function ToolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const tool = TOOLS.find(t => t.id === id);

  if (!tool) {
    return (
      <View style={styles.notFound}>
        <Feather name="alert-circle" size={48} color={C.red} />
        <Text style={styles.notFoundText}>الأداة غير موجودة</Text>
      </View>
    );
  }

  const copyCmd = async (cmd: string, idx: number) => {
    await Clipboard.setStringAsync(cmd);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{tool.name}</Text>
            <View style={styles.starsRow}>
              <Feather name="star" size={16} color={C.gold} />
              <Text style={styles.stars}>{tool.stars}</Text>
            </View>
          </View>
          <Text style={styles.tagline}>{tool.tagline}</Text>
          <View style={styles.badgesRow}>
            <Badge label={tool.category} colors={TAG_COLORS[tool.category]} />
            <View style={{ width: 8 }} />
            <Badge label={tool.level} colors={LEVEL_COLORS[tool.level]} />
          </View>
        </View>

        {/* ─── Meta ─── */}
        <View style={styles.metaCard}>
          <MetaRow icon="user"    label="المطور"  value={tool.author}   />
          <MetaRow icon="monitor" label="المنصة"  value={tool.platform} />
          <MetaRow icon="link"    label="الموقع"  value={tool.website}  last />
        </View>

        {/* ─── Description ─── */}
        <View style={styles.section}>
          <SectionTitle icon="info" title="نبذة عن الأداة" />
          <Text style={styles.description}>{tool.description}</Text>
        </View>

        {/* ─── Commands ─── */}
        <View style={styles.section}>
          <SectionTitle icon="terminal" title="أوامر الأداة" />
          {tool.commands.map((cmd, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.cmdRow}
              onPress={() => copyCmd(cmd, idx)}
              activeOpacity={0.7}
            >
              <Text style={styles.cmdText}>{cmd}</Text>
              <View style={styles.copyBtn}>
                <Feather
                  name={copiedIdx === idx ? 'check' : 'copy'}
                  size={15}
                  color={copiedIdx === idx ? C.green : C.textMuted}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Features ─── */}
        <View style={styles.section}>
          <SectionTitle icon="zap" title="المميزات" />
          {tool.features.map((f, idx) => (
            <View key={idx} style={styles.listItem}>
              <Feather name="check-circle" size={15} color={C.green} style={styles.listIcon} />
              <Text style={styles.listText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* ─── Use Cases ─── */}
        <View style={styles.section}>
          <SectionTitle icon="target" title="حالات الاستخدام" />
          {tool.useCases.map((u, idx) => (
            <View key={idx} style={styles.listItem}>
              <Feather name="arrow-right" size={15} color={C.blue} style={styles.listIcon} />
              <Text style={styles.listText}>{u}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Sub-components ─── */
function MetaRow({ icon, label, value, last }: {
  icon: any; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Feather name={icon} size={15} color={C.green} />
      <Text style={styles.metaLabel}>{label}:</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Feather name={icon} size={17} color={C.green} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  notFound:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  notFoundText:   { color: C.textMuted, fontSize: 18, marginTop: 16 },

  header:         { padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  titleRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name:           { color: C.green, fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  starsRow:       { flexDirection: 'row', alignItems: 'center' },
  stars:          { color: C.gold, fontSize: 14, marginLeft: 4, fontWeight: '700' },
  tagline:        { color: C.text, fontSize: 15, opacity: 0.85, marginBottom: 14, lineHeight: 22 },
  badgesRow:      { flexDirection: 'row', flexWrap: 'wrap' },

  metaCard:       { margin: 16, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 4 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  metaRowBorder:  { borderBottomWidth: 1, borderBottomColor: C.border },
  metaLabel:      { color: C.textMuted, fontSize: 13, marginLeft: 10, marginRight: 6, minWidth: 64 },
  metaValue:      { color: C.text, fontSize: 13, flex: 1 },

  section:          { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitleText: { color: C.text, fontSize: 17, fontWeight: '700', marginLeft: 8 },
  description:      { color: C.text, fontSize: 15, lineHeight: 26, opacity: 0.9 },

  cmdRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12 },
  cmdText:  { flex: 1, color: C.green, fontSize: 13, fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo' },
  copyBtn:  { paddingLeft: 12, marginLeft: 8 },

  listItem: { flexDirection: 'row', marginBottom: 11, alignItems: 'flex-start' },
  listIcon: { marginTop: 2 },
  listText: { color: C.text, fontSize: 14, flex: 1, marginLeft: 10, lineHeight: 22, opacity: 0.9 },
});
