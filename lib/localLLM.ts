import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { terminalEngine } from './terminalEngine';
import { searchKnowledge } from './knowledgeBase';

export type ModelState = 'not_loaded' | 'loading' | 'ready' | 'error';

let context: LlamaContext | null = null;
let currentModelState: ModelState = 'not_loaded';
let lastSessionPath: string | null = null;

export const getModelState = () => currentModelState;

export interface InitOptions {
  n_threads?: number;
  flash_attn?: boolean;
  n_gpu_layers?: number;
}

export const initModel = async (modelPath: string, options: InitOptions = {}): Promise<void> => {
  try {
    currentModelState = 'loading';
    if (context) {
      await context.release();
    }

    const cpuCores = Device.supportedCpuArchitectures?.length || 4;
    const threads = options.n_threads || Math.min(cpuCores, 8);

    context = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 2048,
      n_threads: threads,
      flash_attn: options.flash_attn ?? (Platform.OS === 'ios'), // Often better on iOS Metal
      n_gpu_layers: options.n_gpu_layers ?? 0,
    } as any);

    currentModelState = 'ready';
    lastSessionPath = null;
  } catch (error) {
    console.error('Failed to init model:', error);
    currentModelState = 'error';
    throw error;
  }
};

const AGENT_SYSTEM_PROMPT = `You are REDroid AI, a security-focused assistant. 
You have access to a terminal and a local knowledge base to help the user.
ALWAYS check the local knowledge base using 'knowledge <query>' BEFORE using 'search' (internet) if the user asks about tools, APK structure, or general RE concepts.

If you need to search the internet, download a file, or analyze data you don't have, use the following format:
TOOL_CALL: <command>
Example: TOOL_CALL: knowledge jadx
Example: TOOL_CALL: search how to decompile apk
Example: TOOL_CALL: curl https://example.com/script.sh

Commands available: ls, cd, pwd, cat, curl, wget, strings, hexdump, md5sum, sha256sum, base64, unzip, search, knowledge, dns, whois, portcheck.
After you get the tool result, provide the final answer to the user.
Keep your responses concise and technical.
User current directory: / (ROOT_DIR)`;

export const runAgentLoop = async (
  userPrompt: string,
  onToken: (t: string) => void,
  onToolCall?: (command: string, result: string) => void
): Promise<string> => {
  if (!context || currentModelState !== 'ready') {
    throw new Error('Model not ready');
  }

  let currentContext = `User: ${userPrompt}\nAssistant:`;
  let fullResponse = '';
  let iterations = 0;
  const maxIterations = 3;

  const sessionFile = `${FileSystem.documentDirectory}llama_session.bin`;

  while (iterations < maxIterations) {
    let iterationResponse = '';
    
    const completionParams: any = {
      prompt: iterations === 0 ? `${AGENT_SYSTEM_PROMPT}\n\n${currentContext}` : currentContext,
      n_predict: 512,
      temperature: 0.2, // Lower temperature for tool use
      stop: ['User:', '\nAssistant:'],
    };

    // Load session if exists and it's the first iteration of a follow-up (simplified cache)
    // For now, llama.rn session management is a bit tricky with raw text, 
    // we'll focus on the tool loop logic first.

    const result = await context.completion(
      completionParams,
      (data: any) => {
        iterationResponse += data.token;
        onToken(data.token);
      }
    );

    fullResponse += iterationResponse;

    const toolCallMatch = iterationResponse.match(/TOOL_CALL:\s*(.+)/);
    if (toolCallMatch) {
      const command = toolCallMatch[1].trim();
      iterations++;
      
      try {
        const terminalResult = await terminalEngine.execute(command);
        const resultText = terminalResult.map(l => l.content).join('\n');
        
        if (onToolCall) {
          onToolCall(command, resultText);
        }

        currentContext = `${iterationResponse}\nTOOL_RESULT: ${resultText}\nAssistant:`;
        onToken('\n[Executing Tool...]\n');
      } catch (e: any) {
        currentContext = `${iterationResponse}\nTOOL_ERROR: ${e.message}\nAssistant:`;
      }
    } else {
      break;
    }
  }

  return fullResponse;
};

export const generateCompletion = async (
  prompt: string,
  onToken: (t: string) => void
): Promise<string> => {
  if (!context || currentModelState !== 'ready') {
    throw new Error('Model not ready');
  }

  try {
    const response = await context.completion(
      {
        prompt: prompt,
        n_predict: 512,
        temperature: 0.7,
        top_k: 40,
        top_p: 0.9,
      } as any,
      (data: any) => {
        onToken(data.token);
      }
    );
    return response.text;
  } catch (error) {
    console.error('Inference error:', error);
    throw error;
  }
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
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destPath,
  });
  return destPath;
};
