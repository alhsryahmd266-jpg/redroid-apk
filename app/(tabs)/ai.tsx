import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { C } from '@/constants/colors';
import { initModel, runAgentLoop, getModelState, ModelState, unloadModel, copyModelToLocal } from '@/lib/localLLM';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'tool';
}

export default function AIScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelState, setModelState] = useState<ModelState>(getModelState());
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [useAcceleration, setUseAcceleration] = useState(true);
  const [useAgenticSearch, setUseAgenticSearch] = useState(true);
  const [gpuLayers, setGpuLayers] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setModelState(getModelState());
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (modelState !== 'ready') {
      Alert.alert('Model Not Ready', 'Please import or download a GGUF model first.');
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMsgId, text: '', sender: 'ai' }]);

    try {
      let fullText = '';
      
      if (useAgenticSearch) {
        await runAgentLoop(
          input, 
          (token) => {
            fullText += token;
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: fullText } : m))
            );
          },
          (cmd, res) => {
            const toolMsgId = `tool-${Date.now()}`;
            setMessages((prev) => [
              ...prev,
              { id: toolMsgId, text: `🔧 Executing: ${cmd}\n\nResult:\n${res.slice(0, 500)}${res.length > 500 ? '...' : ''}`, sender: 'tool' }
            ]);
          }
        );
      } else {
        // We can keep generateCompletion or just use runAgentLoop without onToolCall
        await runAgentLoop(
          input, 
          (token) => {
            fullText += token;
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: fullText } : m))
            );
          }
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Inference Failed',
        'The local model failed to respond. Would you like to use the Terminal fallback?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Terminal', 
            onPress: async () => {
              await Clipboard.setStringAsync(input);
              router.push('/terminal' as any);
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImportModel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.name.toLowerCase().endsWith('.gguf')) {
          Alert.alert('Invalid File', 'Please select a .gguf model file.');
          return;
        }

        setModelState('loading');
        const localPath = await copyModelToLocal(asset.uri, asset.name);
        await initModel(localPath, {
          n_threads: useAcceleration ? 8 : 4,
          flash_attn: useAcceleration,
          n_gpu_layers: gpuLayers
        });
        setModelState(getModelState());
        Alert.alert('Success', 'Model imported and loaded successfully.');
      }
    } catch (error) {
      console.error(error);
      setModelState('error');
      Alert.alert('Error', 'Failed to import model.');
    }
  };

  const handleDownloadModel = () => {
    Alert.prompt(
      'Download Model',
      'Enter the URL of the GGUF model file:',
      async (url) => {
        if (!url) return;
        
        const fileName = url.split('/').pop() || 'model.gguf';
        const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
        
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(progress);
          }
        );

        try {
          setIsDownloading(true);
          setModelState('loading');
          const result = await downloadResumable.downloadAsync();
          setIsDownloading(false);
          
          if (result) {
            await initModel(result.uri, {
              n_threads: useAcceleration ? 8 : 4,
              flash_attn: useAcceleration,
              n_gpu_layers: gpuLayers
            });
            setModelState(getModelState());
            Alert.alert('Success', 'Model downloaded and loaded.');
          }
        } catch (e) {
          console.error(e);
          setIsDownloading(false);
          setModelState('error');
          Alert.alert('Download Error', 'Failed to download model.');
        }
      },
      'plain-text'
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'user' ? styles.userBubble : 
      item.sender === 'tool' ? styles.toolBubble : styles.aiBubble
    ]}>
      <Text style={[styles.messageText, item.sender === 'tool' && styles.toolText]}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>REDroid AI</Text>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
            <Text style={{ color: C.green, fontSize: 12 }}>{showSettings ? 'Hide Settings' : 'AI Settings'}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(modelState) }]}>
          <Text style={styles.statusText}>{modelState.toUpperCase()}</Text>
        </View>
      </View>

      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Performance Acceleration</Text>
            <Switch value={useAcceleration} onValueChange={setUseAcceleration} trackColor={{ true: C.green }} />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Agentic Tool Use (Search/Terminal)</Text>
            <Switch value={useAgenticSearch} onValueChange={setUseAgenticSearch} trackColor={{ true: C.green }} />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>GPU Offload Layers (iOS)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setGpuLayers(Math.max(0, gpuLayers - 5))}><Feather name="minus" size={20} color={C.green} /></TouchableOpacity>
              <Text style={{ color: C.text, marginHorizontal: 10 }}>{gpuLayers}</Text>
              <TouchableOpacity onPress={() => setGpuLayers(gpuLayers + 5)}><Feather name="plus" size={20} color={C.green} /></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {modelState !== 'ready' && !isDownloading && (
        <View style={styles.setupContainer}>
          <Feather name="cpu" size={48} color={C.green} style={{ marginBottom: 16 }} />
          <Text style={styles.setupText}>No Local LLM Loaded</Text>
          <Text style={styles.setupSubtext}>Import a GGUF model from your device or download via URL.</Text>
          
          <TouchableOpacity style={styles.button} onPress={handleImportModel}>
            <Feather name="file-plus" size={20} color={C.bg} />
            <Text style={styles.buttonText}>Import GGUF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { marginTop: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.green }]} onPress={handleDownloadModel}>
            <Feather name="download" size={20} color={C.green} />
            <Text style={[styles.buttonText, { color: C.green }]}>Download via URL</Text>
          </TouchableOpacity>
        </View>
      )}

      {isDownloading && (
        <View style={styles.setupContainer}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={styles.setupText}>Downloading Model...</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
          </View>
          <Text style={styles.setupSubtext}>{Math.round(downloadProgress * 100)}%</Text>
        </View>
      )}

      {modelState === 'ready' && (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Ask REDroid AI..."
              placeholderTextColor={C.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!input.trim() || loading) && { opacity: 0.5 }]} 
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <Feather name="send" size={20} color={C.bg} />
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

function getStatusColor(state: ModelState) {
  switch (state) {
    case 'ready': return C.green;
    case 'loading': return C.blue;
    case 'error': return C.red;
    default: return C.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.bg,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  setupText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.text,
    textAlign: 'center',
  },
  setupSubtext: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: C.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    color: C.bg,
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 40,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: C.green,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  toolBubble: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderWidth: 1,
    borderColor: C.green,
    borderRadius: 8,
    width: '100%',
    maxWidth: '100%',
  },
  toolText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: C.green,
  },
  messageText: {
    color: C.text,
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    color: C.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: C.green,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: C.surface,
    borderRadius: 3,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: C.green,
  },
  settingsPanel: {
    padding: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    color: C.text,
    fontSize: 14,
  },
});
