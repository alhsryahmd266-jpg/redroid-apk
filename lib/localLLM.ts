import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { terminalEngine } from './terminalEngine';
import { searchKnowledge } from './knowledgeBase';

export type ModelState = 'not_loaded' | 'loading' | 'ready' | 'error';

let context: LlamaContext | null = null;
let currentModelState: ModelState = 'not_loaded';

export const getModelState = () => currentModelState;

export interface InitOptions {
  n_threads?: number;
  flash_attn?: boolean;
  n_gpu_layers?: number;
}

export const initModel = async (modelPath: string, options: InitOptions = {}): Promise<void> => {
  try {
    currentModelState = 'loading';
    if (context) await context.release();

    const cpuCores = Device.supportedCpuArchitectures?.length || 4;
    const threads  = options.n_threads || Math.min(cpuCores, 8);

    context = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 4096,
      n_threads: threads,
      flash_attn: options.flash_attn ?? (Platform.OS === 'ios'),
      n_gpu_layers: options.n_gpu_layers ?? 0,
    } as any);

    currentModelState = 'ready';
  } catch (error) {
    currentModelState = 'error';
    throw error;
  }
};

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are REDroid AI — an expert Android security researcher and reverse engineering assistant.
You have deep knowledge of APK analysis, Frida, Smali, ADB, Burp Suite, SSL pinning bypass, root detection bypass, and all major RE tools.

You have access to tools you can call using this EXACT format on its own line:
TOOL_CALL: <command>

Available commands:
  knowledge <query>    — search local RE knowledge base (always try this first)
  search <query>       — internet search
  ls [path]            — list files
  cat <file>           — read file
  curl <url>           — fetch URL
  dns <host>           — DNS lookup
  portcheck <host> <port> — check port
  termux <command>     — launch Termux and run command there

Rules:
- Always check the knowledge base before searching the internet.
- After getting a TOOL_RESULT, incorporate it into your answer.
- Be concise, technical, and accurate.
- Respond in the same language the user uses.
- When showing code, use markdown code blocks.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Agent loop with conversation memory ─────────────────────────────────────
export const runAgentLoop = async (
  userPrompt: string,
  onToken: (t: string) => void,
  onToolCall?: (command: string, result: string) => void,
  history: ChatMessage[] = []
): Promise<string> => {
  if (!context || currentModelState !== 'ready') throw new Error('Model not ready');

  // Build full conversation context
  const historyText = history
    .slice(-8) // last 4 exchanges = up to 8 messages
    .map(m => m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`)
    .join('\n');

  let currentPrompt = `${SYSTEM_PROMPT}\n\n${historyText ? historyText + '\n' : ''}User: ${userPrompt}\nAssistant:`;
  let fullResponse  = '';
  let iterations    = 0;
  const maxIter     = 4;

  while (iterations < maxIter) {
    let iterText = '';

    await context.completion(
      {
        prompt: currentPrompt,
        n_predict: 768,
        temperature: 0.25,
        top_k: 40,
        top_p: 0.9,
        stop: ['User:', '\nUser:', '\n\nUser:'],
      } as any,
      (data: any) => {
        iterText += data.token;
        onToken(data.token);
      }
    );

    fullResponse += iterText;

    const toolMatch = iterText.match(/TOOL_CALL:\s*(.+)/);
    if (!toolMatch) break;

    const command = toolMatch[1].trim();
    iterations++;

    try {
      const lines     = await terminalEngine.execute(command);
      const resultTxt = lines.map(l => l.content).join('\n');

      if (onToolCall) onToolCall(command, resultTxt);

      currentPrompt = `${currentPrompt}${iterText}\nTOOL_RESULT: ${resultTxt.slice(0, 600)}\nAssistant:`;
      onToken('\n');
    } catch (e: any) {
      currentPrompt = `${currentPrompt}${iterText}\nTOOL_ERROR: ${e.message}\nAssistant:`;
    }
  }

  return fullResponse;
};

export const unloadModel = async (): Promise<void> => {
  if (context) {
    await context.release();
    context = null;
    currentModelState = 'not_loaded';
  }
};

export const copyModelToLocal = async (sourceUri: string, fileName: string): Promise<string> => {
  const destPath = `${(FileSystem as any).documentDirectory}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  return destPath;
};
