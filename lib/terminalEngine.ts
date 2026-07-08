import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import JSZip from 'jszip';
import { generateCompletion, getModelState } from './localLLM';

// Root directory for our virtual filesystem
const ROOT_DIR = `${FileSystem.documentDirectory}redroid/`;

export interface TerminalLine {
  type: 'input' | 'output' | 'error';
  content: string;
}

class TerminalEngine {
  private currentDir: string = '/';
  private history: string[] = [];

  constructor() {
    this.ensureRootDir();
  }

  private async ensureRootDir() {
    const info = await FileSystem.getInfoAsync(ROOT_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
    }
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    const current = this.currentDir === '/' ? '' : this.currentDir;
    return `${current}/${path}`.replace(/\/+/g, '/');
  }

  private getPhysicalPath(virtualPath: string): string {
    const normalized = this.resolvePath(virtualPath);
    return `${ROOT_DIR}${normalized.slice(1)}`;
  }

  async execute(commandLine: string): Promise<TerminalLine[]> {
    const args = commandLine.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    const params = args.slice(1);

    if (!cmd) return [];

    try {
      switch (cmd) {
        case 'help':
          return [{ type: 'output', content: 'Available commands: ls, cd, pwd, mkdir, touch, cat, rm, cp, mv, echo, clear, help, curl, wget, strings, hexdump, md5sum, sha256sum, base64, unzip, search' }];
        
        case 'ls':
          return await this.ls(params[0] || '.');
        
        case 'pwd':
          return [{ type: 'output', content: this.currentDir }];
        
        case 'cd':
          return await this.cd(params[0] || '/');
        
        case 'mkdir':
          return await this.mkdir(params[0]);
        
        case 'touch':
          return await this.touch(params[0]);
        
        case 'cat':
          return await this.cat(params[0]);
        
        case 'rm':
          return await this.rm(params[0]);

        case 'echo':
          return [{ type: 'output', content: params.join(' ') }];

        case 'clear':
          return [{ type: 'output', content: 'CLEAR_TERMINAL' }];

        case 'curl':
          return await this.curl(params[0]);

        case 'wget':
          return await this.wget(params[0], params[2]); // wget <url> -O <file>

        case 'strings':
          return await this.strings(params[0]);

        case 'hexdump':
          return await this.hexdump(params[0]);

        case 'md5sum':
          return await this.hash(params[0], Crypto.CryptoDigestAlgorithm.MD5);

        case 'sha256sum':
          return await this.hash(params[0], Crypto.CryptoDigestAlgorithm.SHA256);

        case 'base64':
          return this.base64(params[0], params.slice(1).join(' '));

        case 'unzip':
          return await this.unzip(params[0]);

        case 'search':
          return await this.search(params.join(' '));

        case 'ai':
          return await this.ai(params.join(' '));

        default:
          return [{ type: 'error', content: `Command not found: ${cmd}` }];
      }
    } catch (error: any) {
      return [{ type: 'error', content: `Error: ${error.message}` }];
    }
  }

  private async ls(path: string): Promise<TerminalLine[]> {
    const target = this.getPhysicalPath(path);
    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists) throw new Error('No such file or directory');
    if (!info.isDirectory) return [{ type: 'output', content: path }];
    
    const files = await FileSystem.readDirectoryAsync(target);
    return [{ type: 'output', content: files.join('  ') }];
  }

  private async cd(path: string): Promise<TerminalLine[]> {
    if (path === '/') {
      this.currentDir = '/';
      return [];
    }
    const target = this.resolvePath(path);
    const physical = this.getPhysicalPath(target);
    const info = await FileSystem.getInfoAsync(physical);
    if (!info.exists || !info.isDirectory) throw new Error('No such directory');
    this.currentDir = target.endsWith('/') ? target : target + '/';
    return [];
  }

  private async mkdir(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    await FileSystem.makeDirectoryAsync(target, { intermediates: true });
    return [];
  }

  private async touch(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    await FileSystem.writeAsStringAsync(target, '');
    return [];
  }

  private async cat(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    const content = await FileSystem.readAsStringAsync(target);
    return [{ type: 'output', content }];
  }

  private async rm(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    await FileSystem.deleteAsync(target, { idempotent: true });
    return [];
  }

  private async curl(url: string): Promise<TerminalLine[]> {
    if (!url) throw new Error('Missing URL');
    const response = await fetch(url);
    const text = await response.text();
    return [{ type: 'output', content: text }];
  }

  private async wget(url: string, filename?: string): Promise<TerminalLine[]> {
    if (!url) throw new Error('Missing URL');
    const name = filename || url.split('/').pop() || 'downloaded_file';
    const target = this.getPhysicalPath(name);
    await FileSystem.downloadAsync(url, target);
    return [{ type: 'output', content: `Saved to ${name}` }];
  }

  private async strings(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    const content = await FileSystem.readAsStringAsync(target, { encoding: FileSystem.EncodingType.Base64 });
    const decoded = atob(content);
    const strings = decoded.match(/[ -~]{4,}/g);
    return [{ type: 'output', content: strings ? strings.join('\n') : 'No printable strings found' }];
  }

  private async hexdump(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    const content = await FileSystem.readAsStringAsync(target, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    
    let hex = '';
    const slice = bytes.slice(0, 256); // Limit to first 256 bytes
    for (let i = 0; i < slice.length; i += 16) {
      const chunk = slice.slice(i, i + 16);
      const addr = i.toString(16).padStart(8, '0');
      const h = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
      hex += `${addr}  ${h.padEnd(48)}  |${ascii}|\n`;
    }
    return [{ type: 'output', content: hex }];
  }

  private async hash(path: string, algo: Crypto.CryptoDigestAlgorithm): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    const content = await FileSystem.readAsStringAsync(target, { encoding: FileSystem.EncodingType.Base64 });
    const digest = await Crypto.digestStringAsync(algo, content);
    return [{ type: 'output', content: `${digest}  ${path}` }];
  }

  private base64(op: string, text: string): TerminalLine[] {
    if (op === 'encode') {
      return [{ type: 'output', content: btoa(text) }];
    } else if (op === 'decode') {
      return [{ type: 'output', content: atob(text) }];
    }
    throw new Error('Usage: base64 <encode|decode> <text>');
  }

  private async unzip(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument');
    const target = this.getPhysicalPath(path);
    const content = await FileSystem.readAsStringAsync(target, { encoding: FileSystem.EncodingType.Base64 });
    const zip = await JSZip.loadAsync(content, { base64: true });
    
    const folderName = path + '_extracted';
    const folderPath = this.getPhysicalPath(folderName);
    await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });

    const files = Object.keys(zip.files);
    for (const fileName of files) {
      if (!zip.files[fileName].dir) {
        const fileContent = await zip.files[fileName].async('base64');
        const filePath = `${folderPath}/${fileName}`;
        // Ensure parent directory exists
        const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
        await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
        await FileSystem.writeAsStringAsync(filePath, fileContent, { encoding: FileSystem.EncodingType.Base64 });
      }
    }
    return [{ type: 'output', content: `Extracted to ${folderName}/` }];
  }

  private async search(query: string): Promise<TerminalLine[]> {
    if (!query) throw new Error('Missing query');
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();
    
    // Simple regex to extract titles and links from DDG HTML Lite
    const results: string[] = [];
    const regex = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 5) {
      results.push(`${count + 1}. ${match[2]}\n   ${match[1]}`);
      count++;
    }
    
    return [{ type: 'output', content: results.length ? results.join('\n\n') : 'No results found' }];
  }

  private async ai(prompt: string): Promise<TerminalLine[]> {
    if (!prompt) throw new Error('Missing prompt');
    if (getModelState() !== 'ready') {
      return [{ type: 'error', content: 'AI model is not loaded. Please go to the AI tab to load a model first.' }];
    }
    
    let fullResponse = '';
    await generateCompletion(prompt, (token) => {
      fullResponse += token;
    });
    
    return [{ type: 'output', content: fullResponse }];
  }

  getPrompt(): string {
    return `redroid@device:${this.currentDir}$ `;
  }
}

export const terminalEngine = new TerminalEngine();
