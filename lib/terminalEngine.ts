import { Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import JSZip from 'jszip';
import { generateCompletion, getModelState } from './localLLM';
import { searchKnowledge } from './knowledgeBase';
import { analyzeApk } from './apkAnalyzer';

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
          return [{ type: 'output', content: 'Available commands: ls, cd, pwd, mkdir, touch, cat, rm, cp, mv, echo, clear, help, curl, wget, strings, hexdump, md5sum, sha256sum, base64, unzip, search, ai, knowledge, dns, whois, portcheck, analyze' }];
        
        case 'analyze':
          return await this.analyze(params[0]);
        case 'knowledge':
          return this.knowledge(params.join(' '));

        case 'dns':
          return await this.dns(params[0]);

        case 'whois':
          return await this.whois(params[0]);

        case 'portcheck':
          return await this.portcheck(params[0], params[1]);
        
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

        case 'termux':
          return await this.termux(params.join(' '));

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

  private knowledge(query: string): TerminalLine[] {
    if (!query) throw new Error('Missing query');
    const result = searchKnowledge(query);
    return [{ type: 'output', content: result || 'No matching knowledge found localy. Try using "search" to look online.' }];
  }

  private async dns(hostname: string): Promise<TerminalLine[]> {
    if (!hostname) throw new Error('Missing hostname');
    try {
      const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { 'accept': 'application/dns-json' }
      });
      const data = await response.json();
      if (data.Answer) {
        const answers = data.Answer.map((a: any) => `${a.name} [${a.type === 1 ? 'A' : a.type}] -> ${a.data}`).join('\n');
        return [{ type: 'output', content: `DNS records for ${hostname}:\n${answers}` }];
      }
      return [{ type: 'output', content: `No A records found for ${hostname}` }];
    } catch (e: any) {
      throw new Error(`DNS lookup failed: ${e.message}`);
    }
  }

  private async whois(domain: string): Promise<TerminalLine[]> {
    if (!domain) throw new Error('Missing domain');
    try {
      const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
      if (response.status === 404) return [{ type: 'output', content: 'Domain not found' }];
      const data = await response.json();
      
      const events = data.events ? data.events.map((e: any) => `${e.eventAction}: ${e.eventDate}`).join('\n') : 'No events found';
      const entities = data.entities ? data.entities.map((ent: any) => ent.handle).join(', ') : 'No entities found';
      
      return [{ type: 'output', content: `WHOIS/RDAP for ${domain}:\nStatus: ${data.status?.join(', ') || 'N/A'}\nEvents:\n${events}\nEntities: ${entities}` }];
    } catch (e: any) {
      throw new Error(`WHOIS lookup failed: ${e.message}`);
    }
  }

  private async portcheck(host: string, port: string): Promise<TerminalLine[]> {
    if (!host || !port) throw new Error('Usage: portcheck <host> <port>');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      // Note: This is an HTTP-level check as raw TCP is not directly available via fetch.
      // We try both http and https to see if something answers.
      const url = `http://${host}:${port}`;
      const response = await fetch(url, { signal: controller.signal, method: 'HEAD' }).catch(() => null);
      
      clearTimeout(timeout);
      
      if (response) {
        return [{ type: 'output', content: `Port ${port} on ${host} is OPEN (HTTP response: ${response.status})` }];
      } else {
        // If fetch failed, it might be closed or just not an HTTP server.
        // In RN, we can't easily distinguish without native modules, but we'll report it as likely closed or non-HTTP.
        return [{ type: 'output', content: `Port ${port} on ${host} is CLOSED or not responding to HTTP HEAD` }];
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return [{ type: 'output', content: `Port ${port} on ${host} TIMEOUT (Likely closed or filtered)` }];
      }
      return [{ type: 'error', content: `Port check failed: ${e.message}` }];
    } finally {
      clearTimeout(timeout);
    }
  }

  private async analyze(path: string): Promise<TerminalLine[]> {
    if (!path) throw new Error('Missing argument: <path-to-apk>');
    const target = this.getPhysicalPath(path);
    const result = await analyzeApk(target);
    
    let output = `APK Analysis Report: ${path}\n`;
    output += `-----------------------------------\n`;
    output += `Package: ${result.packageName}\n`;
    output += `Version: ${result.versionName} (${result.versionCode})\n`;
    output += `SDK: Min ${result.minSdkVersion}, Target ${result.targetSdkVersion}\n`;
    
    if (result.signingInfo) {
      output += `\nSigning Info:\n`;
      output += `  Issuer: ${result.signingInfo.issuer}\n`;
      output += `  Validity: ${result.signingInfo.validity}\n`;
    }

    const dangerous = ['android.permission.INTERNET', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.CAMERA', 'android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION'];
    
    output += `\nPermissions (${result.permissions.length}):\n`;
    result.permissions.forEach(p => {
      const isDangerous = dangerous.some(d => p.includes(d));
      output += `  ${isDangerous ? '⚠️ ' : '  '}${p}\n`;
    });

    output += `\nComponents: ${result.activities.length} Activities, ${result.services.length} Services, ${result.receivers.length} Receivers\n`;
    
    return [{ type: 'output', content: output }];
  }

  getPrompt(): string {
    return `redroid@device:${this.currentDir}$ `;
  }
  private async termux(command: string): Promise<TerminalLine[]> {
    const cmd = command.trim() || '';
    try {
      const { setStringAsync } = await import('expo-clipboard') as any;
      if (cmd && setStringAsync) await setStringAsync(cmd);
    } catch {}
    try {
      const { Linking } = await import('react-native') as any;
      await Linking.openURL('intent://#Intent;package=com.termux;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end');
      return [{ type: 'output', content: cmd ? 'Termux opened. Command copied to clipboard.' : 'Termux opened.' }];
    } catch {
      return [{ type: 'error', content: 'Termux not installed. Get it from F-Droid.' }];
    }
  }

}

export const terminalEngine = new TerminalEngine();
