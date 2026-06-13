import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { C } from '@/constants/colors';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = ({ code }: CodeBlockProps) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.code}>{code}</Text>
      </ScrollView>
      <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
        <Feather name={copied ? "check" : "copy"} size={16} color={copied ? C.green : C.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#010101',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  scroll: {
    flex: 1,
  },
  code: {
    color: C.green,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
});
