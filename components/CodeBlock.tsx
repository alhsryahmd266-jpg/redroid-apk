import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { C } from '@/constants/colors';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const highlight = (text: string) => {
  const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|try|catch|adb|shell|apktool|frida|objection|jadx|semgrep|nuclei|python3|gdb)\b/g;
  const parts = text.split(keywords);
  return parts.map((part, i) => {
    if (keywords.test(part)) {
      return <Text key={i} style={styles.keyword}>{part}</Text>;
    }
    if (part.startsWith('"') || part.startsWith("'") || part.startsWith('`')) {
      return <Text key={i} style={styles.string}>{part}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
};

export const CodeBlock = ({ code }: CodeBlockProps) => {
  const [copied, setCopied] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1.5, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <View style={styles.container}>
      <View style={styles.lineNumbers}>
        {lines.map((_, i) => (
          <Text key={i} style={styles.lineNumber}>{i + 1}</Text>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.codeContainer}>
          {lines.map((line, i) => (
            <Text key={i} style={styles.codeLine}>
              {highlight(line)}
            </Text>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
        <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
          <Feather 
            name={copied ? "check" : "copy"} 
            size={20} 
            color={copied ? C.green : C.textMuted} 
          />
        </Animated.View>
        {copied && <Text style={styles.copiedText}>تم النسخ</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#010101',
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  lineNumbers: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: C.border,
    alignItems: 'center',
    minWidth: 30,
  },
  lineNumber: {
    color: '#444',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  codeContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  codeLine: {
    color: '#E8E8F0',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  keyword: {
    color: '#FF79C6', // Pink
    fontWeight: 'bold',
  },
  string: {
    color: '#F1FA8C', // Yellow
  },
  copyButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    backgroundColor: '#0A0A0A',
    minWidth: 60,
  },
  copiedText: {
    color: C.green,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
