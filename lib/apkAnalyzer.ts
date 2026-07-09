import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
// @ts-ignore
import AppInfoParser from 'app-info-parser';
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
  signingInfo?: {
    issuer?: string;
    validity?: string;
    fingerprint?: string;
  };
}

export async function analyzeApk(filePath: string): Promise<ApkAnalysis> {
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }

  // app-info-parser needs a Buffer or a file path in Node. 
  // In React Native, we provide a Buffer.
  const base64 = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buffer = Buffer.from(base64, 'base64');

  const parser = new AppInfoParser(buffer);
  const result = await parser.parse();

  // Extract signing info manually since app-info-parser might not do it thoroughly
  const signingInfo = await extractSigningInfo(buffer);

  return {
    packageName: result.package || result.packageName,
    versionName: result.versionName,
    versionCode: result.versionCode,
    minSdkVersion: result.minSdkVersion,
    targetSdkVersion: result.targetSdkVersion,
    permissions: result.usesPermissions || [],
    activities: (result.activities || []).map((a: any) => a.name || a),
    services: (result.services || []).map((s: any) => s.name || s),
    receivers: (result.receivers || []).map((r: any) => r.name || r),
    signingInfo,
  };
}

async function extractSigningInfo(buffer: Buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const metaInfFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('META-INF/') && (name.endsWith('.RSA') || name.endsWith('.DSA') || name.endsWith('.EC'))
    );

    if (metaInfFiles.length > 0) {
      // For now we just report the presence of certificates. 
      // Full parsing of PKCS7/X.509 in pure JS without heavy libs is complex.
      // We can at least list them.
      return {
        issuer: 'Found: ' + metaInfFiles.join(', '),
        validity: 'Present in META-INF',
      };
    }
  } catch (e) {
    console.error('Error extracting signing info:', e);
  }
  return undefined;
}
