import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';

export type ModelState = 'not_loaded' | 'loading' | 'ready' | 'error';

let context: LlamaContext | null = null;
let currentModelState: ModelState = 'not_loaded';

export const getModelState = () => currentModelState;

export const initModel = async (modelPath: string): Promise<void> => {
  try {
    currentModelState = 'loading';
    if (context) {
      await context.release();
    }

    context = await initLlama({
      model: modelPath,
      use_mlock: true,
      n_ctx: 2048,
      n_gpu_layers: 0, // GGUF on mobile usually CPU-bound or specific backends
    });

    currentModelState = 'ready';
  } catch (error) {
    console.error('Failed to init model:', error);
    currentModelState = 'error';
    throw error;
  }
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
