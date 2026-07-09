import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Clipboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { terminalEngine, TerminalLine } from '@/lib/terminalEngine';
import { C } from '@/constants/colors';
import { saveTerminalCommand, getTerminalHistory, clearTerminalHistory } from '@/lib/db';

export default function TerminalScreen() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'output', content: 'REDroid Terminal v1.0.0' },
    { type: 'output', content: 'Type "help" for available commands.' },
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadTerminalHistory();
    // Auto-scroll to bottom when history changes
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [history]);

  const loadTerminalHistory = async () => {
    // Only load once
    if (commandHistory.length === 0) {
      const dbHistory = await getTerminalHistory(50);
      if (dbHistory.length > 0) {
        setCommandHistory(dbHistory.map(h => h.command));
      }
    }
  };

  const handleCommand = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const newHistory: TerminalLine[] = [...history, { type: 'input', content: `${terminalEngine.getPrompt()}${trimmedInput}` }];
    
    // Add to command history
    setCommandHistory(prev => [trimmedInput, ...prev]);
    setHistoryIndex(-1);
    setInput('');

    const results = await terminalEngine.execute(trimmedInput);
    
    // Save to DB
    const output = results.map(r => r.content).join('\n');
    saveTerminalCommand(trimmedInput, output);

    if (results.some(r => r.content === 'CLEAR_TERMINAL')) {
      setHistory([]);
    } else {
      setHistory([...newHistory, ...results]);
    }
  };

  const handleHistoryNavigation = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
    } else {
      newIndex = Math.max(historyIndex - 1, -1);
    }

    setHistoryIndex(newIndex);
    setInput(newIndex === -1 ? '' : commandHistory[newIndex]);
  };

  const copyToClipboard = () => {
    const text = history.map(line => line.content).join('\n');
    Clipboard.setString(text);
  };

  const handlePickAndAnalyze = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.android.package-archive', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      
      setHistory(prev => [...prev, { type: 'input', content: `[User picked: ${asset.name}]` }]);
      setHistory(prev => [...prev, { type: 'output', content: `Analyzing ${asset.name}...` }]);

      // We need to move the file to a place where analyzeApk can access it 
      // or just pass the uri if analyzeApk supports it.
      // Our analyzeApk currently uses FileSystem.getInfoAsync which works with URIs.
      
      const results = await terminalEngine.execute(`analyze ${asset.uri}`);
      setHistory(prev => [...prev, ...results]);
    } catch (error: any) {
      setHistory(prev => [...prev, { type: 'error', content: `Picker error: ${error.message}` }]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Feather name="terminal" size={18} color={C.green} />
          <Text style={styles.title}>TERMINAL</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePickAndAnalyze} style={styles.actionButton}>
            <Feather name="file-plus" size={18} color={C.green} />
          </TouchableOpacity>
          <TouchableOpacity 
            onLongPress={() => {
              Alert.alert('Clear History', 'Clear command history?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => {
                  await clearTerminalHistory();
                  setCommandHistory([]);
                  setHistoryIndex(-1);
                }}
              ]);
            }}
            onPress={copyToClipboard} 
            style={styles.actionButton}
          >
            <Feather name="copy" size={18} color={C.green} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.terminal}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={true}
      >
        {history.map((line, index) => (
          <Text 
            key={index} 
            style={[
              styles.line, 
              line.type === 'error' && styles.errorText,
              line.type === 'input' && styles.inputText
            ]}
          >
            {line.content}
          </Text>
        ))}
      </ScrollView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.prompt}>{terminalEngine.getPrompt()}</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleCommand}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="default"
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <View style={styles.historyControls}>
            <TouchableOpacity onPress={() => handleHistoryNavigation('up')}>
              <Feather name="chevron-up" size={24} color={C.green} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleHistoryNavigation('down')}>
              <Feather name="chevron-down" size={24} color={C.green} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: C.green,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  terminal: {
    flex: 1,
  },
  terminalContent: {
    padding: 16,
  },
  line: {
    color: C.green,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    marginBottom: 4,
  },
  inputText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#050505',
    borderTopWidth: 1,
    borderTopColor: '#111',
  },
  prompt: {
    color: C.green,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  historyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
