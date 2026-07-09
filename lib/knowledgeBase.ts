import { TOOLS } from '../constants/tools';

export interface KnowledgeEntry {
  title: string;
  content: string;
  tags: string[];
}

const CONCEPTS: KnowledgeEntry[] = [
  {
    title: "APK Structure",
    content: "An APK (Android Package) file is a ZIP archive containing: \n- AndroidManifest.xml: App metadata, permissions, and components.\n- classes.dex: Compiled Java/Kotlin code in Dalvik Executable format.\n- res/: App resources (images, layouts).\n- lib/: Native libraries (.so files) for different architectures (ARM, x86).\n- assets/: Raw asset files.\n- META-INF/: Signature and certificate files.",
    tags: ["apk", "structure", "android"]
  },
  {
    title: "DEX Format",
    content: "Dalvik Executable (DEX) is the compiled code format for Android. It is optimized for low memory usage. Tools like JADX and Bytecode Viewer can decompile DEX back into readable Java code. Smali is the human-readable assembly language for DEX.",
    tags: ["dex", "dalvik", "smali", "decompilation"]
  },
  {
    title: "Static vs Dynamic Analysis",
    content: "Static Analysis: Examining the code without executing it (e.g., JADX, APKTool, Ghidra). Good for finding hardcoded secrets and logic bugs.\nDynamic Analysis: Examining the app while it is running (e.g., Frida, Objection, Burp Suite). Good for bypassing checks and analyzing network traffic.",
    tags: ["analysis", "static", "dynamic", "methodology"]
  },
  {
    title: "Obfuscation Techniques",
    content: "Obfuscation is used to make code harder to read. Common techniques include:\n- Name Obfuscation: Renaming classes/methods to 'a', 'b', etc. (ProGuard/R8).\n- Control Flow Flattening: Making the logic jump around unpredictably.\n- String Encryption: Encrypting sensitive strings and decrypting them at runtime.\n- Anti-Tampering: Checking if the APK signature has changed.",
    tags: ["obfuscation", "protection", "proguard", "dexguard"]
  },
  {
    title: "Common Android Vulnerabilities (CVE Classes)",
    content: "1. Insecure Data Storage: Storing secrets in SharedPreferences or SD card in plaintext.\n2. Improper SSL/TLS Validation: Vulnerability to MITM attacks (SSL Pinning bypass needed).\n3. Hardcoded Secrets: API keys or credentials in strings.xml or code.\n4. Exported Components: Activities/Services accessible by other apps without permission.\n5. SQL Injection: If using SQLite without parameterized queries.",
    tags: ["vulnerability", "cve", "security", "owasp"]
  }
];

export const searchKnowledge = (query: string): string | null => {
  const q = query.toLowerCase();
  
  // Search in tools
  const toolMatch = TOOLS.find(t => 
    t.name.toLowerCase().includes(q) || 
    t.id.toLowerCase() === q ||
    t.description.toLowerCase().includes(q)
  );

  if (toolMatch) {
    return `Tool: ${toolMatch.name}\nTagline: ${toolMatch.tagline}\nDescription: ${toolMatch.description}\nCategory: ${toolMatch.category}\nLevel: ${toolMatch.level}\nCommands: \n${toolMatch.commands.join('\n')}\nUse Cases: \n${toolMatch.useCases.join('\n')}`;
  }

  // Search in concepts
  const conceptMatch = CONCEPTS.find(c => 
    c.title.toLowerCase().includes(q) || 
    c.tags.some(tag => tag.toLowerCase().includes(q)) ||
    c.content.toLowerCase().includes(q)
  );

  if (conceptMatch) {
    return `${conceptMatch.title}\n\n${conceptMatch.content}`;
  }

  return null;
};
