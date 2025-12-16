import fs from 'fs';
import path from 'path';

const TEMP_DIR = '/tmp/packputer';

export function ensureTempDir(): string {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  return TEMP_DIR;
}

export function getTempFilePath(prefix: string, extension: string): string {
  const dir = ensureTempDir();
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  return path.join(dir, filename);
}

export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error);
  }
}

