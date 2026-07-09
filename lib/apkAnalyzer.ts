import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import JSZip from 'jszip';

export interface ApkAnalysis {
  packageName: string;
  versionName: string;
  versionCode: string | number;
  minSdkVersion: string | number;
  targetSdkVersion: string | number;
  permissions: string[];
  activities: string[];
  services: string[];
  receivers: string[];
  signingInfo?: { certSubject?: string };
  nativeLibs?: string[];
  fileCount?: number;
  sizeKB?: number;
}

interface ParsedManifest {
  package: string; versionName: string; versionCode: number;
  minSdk: number; targetSdk: number;
  permissions: string[]; activities: string[];
  services: string[]; receivers: string[];
}

function parseAXML(buf: Buffer): ParsedManifest {
  const result: ParsedManifest = {
    package: '', versionName: '', versionCode: 0,
    minSdk: 0, targetSdk: 0,
    permissions: [], activities: [], services: [], receivers: [],
  };
  const u16 = (o: number) => buf.readUInt16LE(o);
  const u32 = (o: number) => buf.readUInt32LE(o);
  if (buf.length < 8) return result;

  const axmlHeaderSize = u16(2);
  let off = axmlHeaderSize;
  if (off + 28 > buf.length || u16(off) !== 0x0001) return result;

  const spHeaderSize = u16(off + 2);
  const spChunkSize  = u32(off + 4);
  const stringCount  = u32(off + 8);
  const flags        = u32(off + 16);
  const stringsStart = u32(off + 20);
  const isUTF8       = !!(flags & 0x100);
  const spBase       = off;
  const offsetsBase  = spBase + spHeaderSize;
  const strDataBase  = spBase + stringsStart;

  const strings: string[] = [];
  for (let i = 0; i < stringCount; i++) {
    const oOff = offsetsBase + i * 4;
    if (oOff + 4 > buf.length) break;
    const strOff = strDataBase + u32(oOff);
    if (strOff >= buf.length) { strings.push(''); continue; }
    try {
      if (isUTF8) {
        const utf8Len = buf[strOff + 1];
        strings.push(buf.slice(strOff + 2, strOff + 2 + utf8Len).toString('utf8'));
      } else {
        const charCount = u16(strOff);
        strings.push(buf.slice(strOff + 2, strOff + 2 + charCount * 2).toString('utf16le'));
      }
    } catch { strings.push(''); }
  }

  off += spChunkSize;

  while (off + 8 <= buf.length) {
    const chunkType      = u16(off);
    const chunkHeaderSize = u16(off + 2);
    const chunkSize      = u32(off + 4);
    if (chunkSize <= 0 || off + chunkSize > buf.length) break;

    if (chunkType === 0x0102 && off + 28 <= buf.length) {
      const nameIdx   = u32(off + 16);
      const elemName  = nameIdx < strings.length ? strings[nameIdx] : '';
      const attrSize  = u16(off + 22);
      const attrCount = u16(off + 24);
      const attrBase  = off + chunkHeaderSize;

      const attrs: Record<string, string> = {};
      for (let a = 0; a < attrCount; a++) {
        const aOff = attrBase + a * attrSize;
        if (aOff + 20 > buf.length) break;
        const nameI    = u32(aOff + 4);
        const typeByte = (u32(aOff + 12) >> 24) & 0xFF;
        const dataVal  = u32(aOff + 16);
        const name     = nameI < strings.length ? strings[nameI] : '';
        let value = '';
        if (typeByte === 0x03 && dataVal < strings.length) value = strings[dataVal];
        else if (typeByte === 0x10 || typeByte === 0x11 || typeByte === 0x12) value = String(dataVal | 0);
        if (name) attrs[name] = value;
      }

      switch (elemName) {
        case 'manifest':
          result.package     = attrs['package']     || result.package;
          result.versionName = attrs['versionName'] || result.versionName;
          result.versionCode = parseInt(attrs['versionCode'] || '0') || result.versionCode;
          break;
        case 'uses-sdk':
          result.minSdk    = parseInt(attrs['minSdkVersion']    || '0') || result.minSdk;
          result.targetSdk = parseInt(attrs['targetSdkVersion'] || '0') || result.targetSdk;
          break;
        case 'uses-permission':
          if (attrs['name']) result.permissions.push(attrs['name']); break;
        case 'activity':
          if (attrs['name']) result.activities.push(attrs['name']); break;
        case 'service':
          if (attrs['name']) result.services.push(attrs['name']); break;
        case 'receiver':
          if (attrs['name']) result.receivers.push(attrs['name']); break;
      }
    }
    off += chunkSize;
  }

  // Fallback scan for permissions
  if (result.permissions.length === 0) {
    const text = buf.toString('latin1');
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    const re = /android\.permission\.[A-Z_]+/g;
    while ((m = re.exec(text)) !== null) found.add(m[0]);
    result.permissions = Array.from(found);
  }

  return result;
}

function parseCertInfo(certBuf: Buffer): { certSubject: string } {
  const text = certBuf.toString('latin1');
  const cnMatch = text.match(/CN=([^\x00-\x1f,]+)/);
  const oMatch  = text.match(/O=([^\x00-\x1f,]+)/);
  const certSubject = [
    cnMatch ? `CN=${cnMatch[1].replace(/[^\x20-\x7E]/g, '')}` : '',
    oMatch  ? `O=${oMatch[1].replace(/[^\x20-\x7E]/g, '')}` : '',
  ].filter(Boolean).join(', ') || 'Unknown';
  return { certSubject };
}

export async function analyzeApk(filePath: string): Promise<ApkAnalysis> {
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists) throw new Error('File not found');

  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buf  = Buffer.from(base64, 'base64');
  const sizeKB = Math.round(buf.length / 1024);

  const zip = await JSZip.loadAsync(buf);
  const fileCount = Object.keys(zip.files).length;

  let parsed: ParsedManifest = {
    package: '', versionName: '', versionCode: 0,
    minSdk: 0, targetSdk: 0,
    permissions: [], activities: [], services: [], receivers: [],
  };
  const manifestFile = zip.file('AndroidManifest.xml');
  if (manifestFile) {
    const manifestBuf = Buffer.from(await manifestFile.async('uint8array'));
    parsed = parseAXML(manifestBuf);
  }

  const nativeLibs: string[] = [];
  zip.forEach((path) => {
    if (path.startsWith('lib/') && path.endsWith('.so')) {
      const parts = path.split('/');
      if (parts.length >= 3) nativeLibs.push(parts[2]);
    }
  });

  let signingInfo: ApkAnalysis['signingInfo'];
  const certFiles = Object.keys(zip.files).filter(n =>
    n.startsWith('META-INF/') && (n.endsWith('.RSA') || n.endsWith('.DSA') || n.endsWith('.EC'))
  );
  if (certFiles.length) {
    const certBuf = Buffer.from(await zip.files[certFiles[0]].async('uint8array'));
    signingInfo = parseCertInfo(certBuf);
  }

  return {
    packageName:      parsed.package      || 'unknown',
    versionName:      parsed.versionName  || 'unknown',
    versionCode:      parsed.versionCode,
    minSdkVersion:    parsed.minSdk,
    targetSdkVersion: parsed.targetSdk,
    permissions:      parsed.permissions,
    activities:       parsed.activities,
    services:         parsed.services,
    receivers:        parsed.receivers,
    signingInfo,
    nativeLibs: [...new Set(nativeLibs)],
    fileCount,
    sizeKB,
  };
}
