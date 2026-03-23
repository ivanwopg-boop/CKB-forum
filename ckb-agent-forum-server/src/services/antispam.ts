/**
 * Rate Limiter & Anti-Spam Service
 * Prevents flooding and abuse
 */

import { Database } from './database';

interface RateLimitEntry {
  address: string;
  action: string;
  count: number;
  window_start: number;
}

// Configuration
const RATE_LIMITS = {
  // Actions: max requests per window
  'register': { max: 3, window: 3600 * 1000 },    // 3 注册/小时
  'post': { max: 10, window: 3600 * 1000 },       // 10 帖子/小时
  'comment': { max: 30, window: 3600 * 1000 },    // 30 评论/小时
  'like': { max: 50, window: 3600 * 1000 },      // 50 点赞/小时
  'message': { max: 20, window: 3600 * 1000 },   // 20 私信/小时
  'follow': { max: 30, window: 3600 * 1000 },    // 30 关注/小时
};

const WINDOW_SIZE = 3600 * 1000; // 1 hour

export class AntiSpamService {
  
  /**
   * Check if action is rate limited
   */
  static checkRateLimit(address: string, action: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE;
    
    // Get rate limit record
    const record = Database.get(
      `SELECT * FROM rate_limits 
       WHERE address = ? AND action = ? AND window_start > ?`,
      [address, action, windowStart]
    ) as RateLimitEntry | undefined;
    
    const limit = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
    if (!limit) {
      return { allowed: true, remaining: 999, resetAt: now + WINDOW_SIZE };
    }
    
    const currentCount = record?.count || 0;
    const remaining = Math.max(0, limit.max - currentCount);
    const resetAt = (record?.window_start || now) + WINDOW_SIZE;
    
    return {
      allowed: currentCount < limit.max,
      remaining,
      resetAt
    };
  }
  
  /**
   * Record an action (increment counter)
   */
  static recordAction(address: string, action: string): void {
    const now = Date.now();
    const windowStart = now - (now % WINDOW_SIZE);
    
    const existing = Database.get(
      `SELECT id FROM rate_limits 
       WHERE address = ? AND action = ? AND window_start = ?`,
      [address, action, windowStart]
    );
    
    if (existing) {
      Database.run(
        `UPDATE rate_limits SET count = count + 1, updated_at = ? 
         WHERE address = ? AND action = ?`,
        [now, address, action]
      );
    } else {
      Database.run(
        `INSERT INTO rate_limits (address, action, count, window_start) 
         VALUES (?, ?, 1, ?)`,
        [address, action, windowStart]
      );
    }
  }
  
  /**
   * Check and record in one call
   */
  static checkAndRecord(address: string, action: string): { allowed: boolean; message?: string } {
    const limit = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
    if (!limit) {
      // Unknown action, allow but warn
      console.warn(`Unknown action: ${action}`);
      return { allowed: true };
    }
    
    const { allowed, remaining, resetAt } = this.checkRateLimit(address, action);
    
    if (!allowed) {
      const minutes = Math.ceil((resetAt - Date.now()) / 60000);
      return { 
        allowed: false, 
        message: `Rate limit exceeded. Try again in ${minutes} minutes.` 
      };
    }
    
    // Record the action
    this.recordAction(address, action);
    
    return { allowed: true };
  }
  
  /**
   * Get rate limit status for all actions
   */
  static getStatus(address: string): Record<string, { limit: number; remaining: number; resetAt: number }> {
    const status: Record<string, any> = {};
    
    for (const action of Object.keys(RATE_LIMITS)) {
      const { allowed, remaining, resetAt } = this.checkRateLimit(address, action);
      status[action] = {
        limit: RATE_LIMITS[action as keyof typeof RATE_LIMITS].max,
        remaining,
        resetAt
      };
    }
    
    return status;
  }
  
  /**
   * Check content for spam patterns
   */
  static checkContent(content: string): { isSpam: boolean; reason?: string } {
    if (!content) return { isSpam: false };
    
    const spamPatterns = [
      /(.)\1{10,}/,                    // Repeated characters
      /[A-Z]{20,}/,                     // Too many caps
      /https?:\/\/[^\s]{50,}/,         // Long URLs
      /\b(free|win|click|buy|spam)\b.{5,}/i,  // Spam keywords
    ];
    
    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return { isSpam: true, reason: 'Content matches spam pattern' };
      }
    }
    
    // Check content length
    if (content.length > 50000) {
      return { isSpam: true, reason: 'Content too long' };
    }
    
    return { isSpam: false };
  }
  
  /**
   * Initialize rate limits table
   */
  static initializeTable(): void {
    Database.run(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        action TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        window_start INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(address, action, window_start)
      )
    `);
  }
}
