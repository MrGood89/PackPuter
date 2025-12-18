/**
 * Caching Layer for Sticker Generation
 * Caches prepared assets and generated outputs to avoid reprocessing
 */
import fs from 'fs';
import crypto from 'crypto';
import { getTempFilePath } from '../util/file';

interface CacheEntry {
  key: string;
  filePath: string;
  createdAt: number;
  expiresAt: number;
}

class StickerCache {
  private cacheDir: string;
  private maxAge: number; // 24 hours in milliseconds
  private entries: Map<string, CacheEntry>;

  constructor() {
    this.cacheDir = '/tmp/packputer/cache';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    this.entries = new Map();
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Clean up expired entries on startup
    this.cleanupExpired();
  }

  /**
   * Generate cache key from base image and generation parameters
   */
  generateKey(baseImagePath: string, params: {
    template?: string;
    context?: string;
    seed?: number;
    count?: number;
  }): string {
    // Hash base image
    const imageHash = this.hashFile(baseImagePath);
    
    // Hash parameters
    const paramsStr = JSON.stringify(params);
    const paramsHash = crypto.createHash('sha256').update(paramsStr).digest('hex').substring(0, 16);
    
    return `${imageHash}_${paramsHash}`;
  }

  /**
   * Hash file content
   */
  private hashFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get cached file if exists and not expired
   */
  get(key: string): string | null {
    const entry = this.entries.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      // Clean up file
      if (fs.existsSync(entry.filePath)) {
        try {
          fs.unlinkSync(entry.filePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      return null;
    }
    
    // Check if file still exists
    if (!fs.existsSync(entry.filePath)) {
      this.entries.delete(key);
      return null;
    }
    
    return entry.filePath;
  }

  /**
   * Store file in cache
   */
  set(key: string, filePath: string): void {
    const now = Date.now();
    const cachePath = `${this.cacheDir}/${key}_${now}.tmp`;
    
    // Copy file to cache
    try {
      fs.copyFileSync(filePath, cachePath);
      
      const entry: CacheEntry = {
        key,
        filePath: cachePath,
        createdAt: now,
        expiresAt: now + this.maxAge,
      };
      
      this.entries.set(key, entry);
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't fail if cache fails
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, entry] of this.entries.entries()) {
      if (now > entry.expiresAt) {
        expired.push(key);
        if (fs.existsSync(entry.filePath)) {
          try {
            fs.unlinkSync(entry.filePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    }
    
    expired.forEach(key => this.entries.delete(key));
    
    // Also clean up old files in cache directory
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        const filePath = `${this.cacheDir}/${file}`;
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > this.maxAge) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    for (const entry of this.entries.values()) {
      if (fs.existsSync(entry.filePath)) {
        try {
          fs.unlinkSync(entry.filePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
    this.entries.clear();
  }
}

export const stickerCache = new StickerCache();

