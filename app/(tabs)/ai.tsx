import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Animated,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '@/constants/colors';
import { initModel, runAgentLoop, getModelState, ModelState, unloadModel, copyModelToLocal } from '@/lib/localLLM';
import { saveChatMessage, getChatHistory, clearChatHistory } from '@/lib/db';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'tool';
  created_at?: number;
  isStreaming?: boolean;
  toolExpanded?: boolean;
}

const SUGGESTIONS = [
  { icon: 'unlock', label: 'حلل APK' },
  { icon: 'search', label: 'كيف يعمل Frida؟' },
  { icon: 'shield', label: 'تقنيات SSL Pinning' },
  { icon: 'code', label: 'استخراج المفاتيح' },
  { icon: 'cpu', label: 'هندسة عكسية سريعة' },
  { icon: 'alert-circle', label: 'اكتشاف التشفير' },
];

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', gap: 4, padding: 4 }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }, dotStyle(d)]} />
      ))}
    </View>
  );
}

function AIAvatar({ size = 32 }: { size?: number }) {
  return (
    <LinearGradient
      colors={['#00FF88', '#00AAFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text style={{ fontSize: size * 0.45, fontWeight: '900', color: '#050508', letterSpacing: -0.5 }}>R</Text>
    </LinearGradient>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split('\n');
  let codeBlockLines: string[] = [];
  let inCodeBlock = false;
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        nodes.push(
          <View key={key++} style={md.codeBlock}>
            <Text style={md.codeText}>{codeBlockLines.join('\n')}</Text>
          </View>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(<Text key={key++} style={md.h3}>{line.slice(4)}</Text>);
    } else if (line.startsWith('## ')) {
      nodes.push(<Text key={key++} style={md.h2}>{line.slice(3)}</Text>);
    } else if (line.startsWith('# ')) {
      nodes.push(<Text key={key++} style={md.h1}>{line.slice(2)}</Text>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push(
        <View key={key++} style={md.bullet}>
          <View style={md.bulletDot} />
          <Text style={md.bodyText}>{parseInline(line.slice(2))}</Text>
        </View>
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      nodes.push(
        <View key={key++} style={md.bullet}>
          <Text style={md.bulletNum}>{num}.</Text>
          <Text style={md.bodyText}>{parseInline(line.replace(/^\d+\. /, ''))}</Text>
        </View>
      );
    } else if (line.trim() === '') {
      nodes.push(<View key={key++} style={{ height: 6 }} />);
    } else {
      nodes.push(<Text key={key++} style={md.bodyText}>{parseInline(line)}</Text>);
    }
  }

  return nodes;
}

function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0, match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<Text key={key++}>{text.slice(last, match.index)}</Text>);
    if (match[2]) parts.push(<Text key={key++} style={{ fontWeight: '700', color: C.text }}>{match[2]}</Text>);
    else if (match[3]) parts.push(<Text key={key++} style={md.inlineCode}>{match[3]}</Text>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<Text key={key++}>{text.slice(last)}</Text>);
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

const md = StyleSheet.create({
  h1: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4, marginTop: 4 },
  h2: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4, marginTop: 4 },
  h3: { fontSize: 14, fontWeight: '700', color: C.green, marginBottom: 2, marginTop: 4 },
  bodyText: { fontSize: 15, color: C.text, lineHeight: 22, flexShrink: 1, flexWrap: 'wrap' },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2, gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, marginTop: 8 },
  bulletNum: { fontSize: 14, color: C.green, fontWeight: '700', minWidth: 20 },
  codeBlock: {
    backgroundColor: '#0A0A14',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    color: '#00FF88',
    lineHeight: 18,
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    color: '#00CC88',
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
});

function ToolCard({ text, defaultExpanded = false }: { text: string; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const lines = text.split('\n');
  const title = lines[0]?.replace('🔧 Executing: ', '') || 'Tool';
  const body = lines.slice(2).join('\n');

  return (
    <Pressable
      onPress={() => setExpanded(e => !e)}
      style={({ pressed }) => [styles.toolCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.toolCardHeader}>
        <View style={styles.toolCardLeft}>
          <View style={styles.toolIcon}>
            <Feather name="terminal" size={13} color={C.green} />
          </View>
          <Text style={styles.toolTitle} numberOfLines={1}>{title}</Text>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
      </View>
      {expanded && (
        <Text style={styles.toolBody}>{body || text}</Text>
      )}
    </Pressable>
  );
}

function MessageItem({
  item,
  onCopy,
}: {
  item: Message;
  onCopy: (text: string) => void;
}) {
  if (item.sender === 'tool') {
    return (
      <View style={styles.toolRow}>
        <ToolCard text={item.text} />
      </View>
    );
  }

  if (item.sender === 'user') {
    return (
      <Pressable
        onLongPress={() => onCopy(item.text)}
        style={styles.userRow}
      >
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onLongPress={() => onCopy(item.text)} style={styles.aiRow}>
      <AIAvatar size={30} />
      <View style={styles.aiContent}>
        {item.isStreaming && item.text === '' ? (
          <TypingDots />
        ) : (
          <>
            {renderMarkdown(item.text)}
            {item.isStreaming && (
              <View style={styles.streamingCursor} />
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

export default function AIScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelState, setModelState] = useState<ModelState>(getModelState());
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [useAcceleration, setUseAcceleration] = useState(true);
  const [useAgenticSearch, setUseAgenticSearch] = useState(true);
  const [gpuLayers, setGpuLayers] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setModelState(getModelState());
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await getChatHistory();
    if (history.length > 0) {
      setMessages(history.map(m => ({
        id: m.id,
        text: m.text,
        sender: m.sender as 'user' | 'ai' | 'tool',
        created_at: m.created_at,
      })));
    }
  };

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleClearChat = () => {
    Alert.alert('مسح المحادثة', 'هل تريد حذف كل الرسائل؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'مسح',
        style: 'destructive',
        onPress: async () => {
          await clearChatHistory();
          setMessages([]);
        },
      },
    ]);
  };

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;

    if (modelState !== 'ready') {
      Alert.alert('النموذج غير محمّل', 'يرجى استيراد أو تحميل نموذج GGUF أولاً.');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      created_at: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    saveChatMessage({ ...userMsg, session_id: 'default', created_at: userMsg.created_at! });
    setInput('');
    setLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    const aiCreatedAt = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai', created_at: aiCreatedAt, isStreaming: true }]);

    try {
      let fullText = '';
      const chatHistory = messages.filter(m => m.sender !== 'tool').map(m => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));
      await runAgentLoop(
        text,
        (token) => {
          fullText += token;
          setMessages(prev =>
            prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
          );
        },
        useAgenticSearch ? (cmd, res) => {
          const toolMsg: Message = {
            id: `tool-${Date.now()}`,
            text: `🔧 Executing: ${cmd}\n\nResult:\n${res.slice(0, 500)}${res.length > 500 ? '…' : ''}`,
            sender: 'tool',
            created_at: Date.now(),
          };
          setMessages(prev => [...prev, toolMsg]);
          saveChatMessage({ ...toolMsg, session_id: 'default', created_at: toolMsg.created_at! });
        } : undefined,
        chatHistory
      );
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));
      saveChatMessage({ id: aiMsgId, text: fullText, sender: 'ai', session_id: 'default', created_at: aiCreatedAt });
    } catch {
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, text: '⚠️ فشل النموذج في الاستجابة.' } : m));
    } finally {
      setLoading(false);
    }
  };

  const handleImportModel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (!asset.name.toLowerCase().endsWith('.gguf')) {
          Alert.alert('ملف غير صالح', 'يرجى اختيار ملف .gguf');
          return;
        }
        setModelState('loading');
        const localPath = await copyModelToLocal(asset.uri, asset.name);
        await initModel(localPath, { n_threads: useAcceleration ? 8 : 4, flash_attn: useAcceleration, n_gpu_layers: gpuLayers });
        setModelState(getModelState());
        Alert.alert('✅ نجاح', 'تم تحميل النموذج بنجاح.');
      }
    } catch {
      setModelState('error');
      Alert.alert('خطأ', 'فشل استيراد النموذج.');
    }
  };

  const handleDownloadModel = () => {
    Alert.prompt('تحميل نموذج', 'أدخل رابط ملف GGUF:', async (url) => {
      if (!url) return;
      const fileName = url.split('/').pop() || 'model.gguf';
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
      const dl = FileSystem.createDownloadResumable(url, fileUri, {}, (p) => {
        setDownloadProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });
      try {
        setIsDownloading(true);
        setModelState('loading');
        const result = await dl.downloadAsync();
        setIsDownloading(false);
        if (result) {
          await initModel(result.uri, { n_threads: useAcceleration ? 8 : 4, flash_attn: useAcceleration, n_gpu_layers: gpuLayers });
          setModelState(getModelState());
          Alert.alert('✅ تم', 'تم تحميل النموذج.');
        }
      } catch {
        setIsDownloading(false);
        setModelState('error');
        Alert.alert('خطأ في التحميل', 'فشل تنزيل النموذج.');
      }
    }, 'plain-text');
  };

  const statusDot = modelState === 'ready' ? C.green : modelState === 'loading' ? C.blue : C.red;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AIAvatar size={34} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>REDroid AI</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
              <Text style={styles.statusLabel}>
                {modelState === 'ready' ? 'جاهز' : modelState === 'loading' ? 'جاري التحميل…' : 'غير نشط'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSettings(true)}>
            <Feather name="sliders" size={18} color={C.textMuted} />
          </TouchableOpacity>
          {messages.length > 0 && (
            <TouchableOpacity style={styles.headerBtn} onPress={handleClearChat}>
              <Feather name="trash-2" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Downloading ── */}
      {isDownloading && (
        <View style={styles.downloadBanner}>
          <ActivityIndicator size="small" color={C.green} />
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` as any }]} />
          </View>
          <Text style={styles.downloadPct}>{Math.round(downloadProgress * 100)}%</Text>
        </View>
      )}

      {/* ── Model not loaded ── */}
      {modelState !== 'ready' && !isDownloading && (
        <View style={styles.setupContainer}>
          <LinearGradient
            colors={['rgba(0,255,136,0.15)', 'rgba(0,170,255,0.08)']}
            style={styles.setupGlow}
          >
            <Feather name="cpu" size={52} color={C.green} />
          </LinearGradient>
          <Text style={styles.setupTitle}>مرحباً في REDroid AI</Text>
          <Text style={styles.setupSub}>استورد نموذج GGUF من جهازك أو حمّله عبر رابط مباشر للبدء.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleImportModel}>
            <Feather name="file-plus" size={18} color='#050508' />
            <Text style={styles.primaryBtnText}>استورد GGUF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleDownloadModel}>
            <Feather name="download" size={18} color={C.green} />
            <Text style={styles.secondaryBtnText}>حمّل عبر رابط</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Chat ── */}
      {modelState === 'ready' && (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.chatContent,
              messages.length === 0 && styles.chatEmpty,
            ]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => <MessageItem item={item} onCopy={handleCopy} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <AIAvatar size={60} />
                <Text style={styles.emptyGreeting}>مرحباً، كيف أساعدك؟</Text>
                <Text style={styles.emptySub}>اسألني عن الهندسة العكسية، تحليل APK، وأكثر.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }}>
                  <View style={styles.chips}>
                    {SUGGESTIONS.map((s) => (
                      <TouchableOpacity
                        key={s.label}
                        style={styles.chip}
                        onPress={() => handleSend(s.label)}
                      >
                        <Feather name={s.icon as any} size={13} color={C.green} />
                        <Text style={styles.chipText}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            }
          />

          {/* ── Input Bar ── */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.inputWrapper, { paddingBottom: insets.bottom || 12 }]}>
              <LinearGradient
                colors={[C.border, loading ? C.green : C.borderBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.inputGradientBorder}
              >
                <View style={styles.inputInner}>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder="اسأل REDroid AI…"
                    placeholderTextColor={C.textDim}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={2000}
                    returnKeyType="default"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                    onPress={() => handleSend()}
                    disabled={!input.trim() || loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color='#050508' />
                    ) : (
                      <Feather name="send" size={16} color='#050508' />
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              <Text style={styles.inputHint}>اضغط مطولاً على الرسالة لنسخها</Text>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      {/* ── Settings Modal ── */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>إعدادات AI</Text>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>تسريع الأداء</Text>
              <Text style={styles.settingDesc}>Flash Attention + Multi-thread</Text>
            </View>
            <Switch value={useAcceleration} onValueChange={setUseAcceleration} trackColor={{ true: C.green, false: C.border }} thumbColor={C.text} />
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>وضع الوكيل الذكي</Text>
              <Text style={styles.settingDesc}>استخدام الأدوات تلقائياً</Text>
            </View>
            <Switch value={useAgenticSearch} onValueChange={setUseAgenticSearch} trackColor={{ true: C.green, false: C.border }} thumbColor={C.text} />
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>طبقات GPU</Text>
              <Text style={styles.settingDesc}>للأجهزة المدعومة فقط</Text>
            </View>
            <View style={styles.gpuControl}>
              <TouchableOpacity onPress={() => setGpuLayers(Math.max(0, gpuLayers - 5))} style={styles.gpuBtn}>
                <Feather name="minus" size={16} color={C.green} />
              </TouchableOpacity>
              <Text style={styles.gpuValue}>{gpuLayers}</Text>
              <TouchableOpacity onPress={() => setGpuLayers(gpuLayers + 5)} style={styles.gpuBtn}>
                <Feather name="plus" size={16} color={C.green} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.modalActionBtn} onPress={handleImportModel}>
            <Feather name="file-plus" size={16} color={C.green} />
            <Text style={styles.modalActionText}>استورد نموذج GGUF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalActionBtn} onPress={handleDownloadModel}>
            <Feather name="download" size={16} color={C.blue} />
            <Text style={[styles.modalActionText, { color: C.blue }]}>حمّل نموذج عبر رابط</Text>
          </TouchableOpacity>
          {modelState === 'ready' && (
            <TouchableOpacity style={[styles.modalActionBtn, { borderColor: C.redMuted }]} onPress={() => { unloadModel(); setModelState(getModelState()); setShowSettings(false); }}>
              <Feather name="power" size={16} color={C.red} />
              <Text style={[styles.modalActionText, { color: C.red }]}>إلغاء تحميل النموذج</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.modalActionBtn, { marginTop: 8, borderColor: C.border }]} onPress={() => setShowSettings(false)}>
            <Text style={[styles.modalActionText, { color: C.textMuted }]}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11, color: C.textMuted },
  headerRight: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 8, borderRadius: 8 },

  downloadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  progressBarBg: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.green, borderRadius: 2 },
  downloadPct: { fontSize: 12, color: C.textMuted, minWidth: 36, textAlign: 'right' },

  setupContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  setupGlow: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  setupTitle: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'center' },
  setupSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.green, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 14, width: '100%', justifyContent: 'center', marginTop: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#050508' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.green, paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 14, width: '100%', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: C.green },

  chatContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 4 },
  chatEmpty: { flex: 1, justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyGreeting: { fontSize: 26, fontWeight: '800', color: C.text, marginTop: 20, textAlign: 'center' },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingHorizontal: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  chipText: { fontSize: 13, color: C.text, fontWeight: '500' },

  userRow: { alignItems: 'flex-end', marginVertical: 4 },
  userBubble: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderBright,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    maxWidth: '80%',
  },
  userText: { fontSize: 15, color: C.text, lineHeight: 22 },

  aiRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8, gap: 10 },
  aiContent: { flex: 1, paddingTop: 2, gap: 2 },

  streamingCursor: {
    width: 2,
    height: 18,
    backgroundColor: C.green,
    borderRadius: 1,
    marginTop: 4,
    opacity: 0.9,
  },

  toolRow: { marginVertical: 6 },
  toolCard: {
    backgroundColor: 'rgba(0,255,136,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.2)',
    borderRadius: 12,
    padding: 10,
  },
  toolCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  toolIcon: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: 'rgba(0,255,136,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  toolTitle: { fontSize: 12, color: C.green, fontWeight: '600', flex: 1 },
  toolBody: {
    marginTop: 8, fontSize: 12, color: C.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 17,
  },

  inputWrapper: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: C.bg },
  inputGradientBorder: { borderRadius: 26, padding: 1.5 },
  inputInner: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: C.surface, borderRadius: 25,
    paddingLeft: 18, paddingRight: 6, paddingVertical: 6,
    gap: 6,
  },
  textInput: {
    flex: 1, color: C.text, fontSize: 15, maxHeight: 120,
    paddingTop: 6, paddingBottom: 6, lineHeight: 22,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.green, justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.4 },
  inputHint: { fontSize: 10, color: C.textDim, textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 4,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  settingDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  gpuControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gpuBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  gpuValue: { fontSize: 15, fontWeight: '700', color: C.text, minWidth: 28, textAlign: 'center' },
  modalActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 16, marginTop: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
  },
  modalActionText: { fontSize: 14, fontWeight: '600', color: C.green },
});
