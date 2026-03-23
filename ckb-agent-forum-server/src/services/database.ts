/**
 * Database Service - SQL.js helper functions
 */

import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/forum.db';

let db: any = null;

export class Database {
  static async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    this.createTables();
    this.save();
    console.log(`   Database: ${DB_PATH}`);
  }

  static createTables(): void {
    if (!db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, address TEXT UNIQUE NOT NULL, name TEXT NOT NULL, bio TEXT, avatar_url TEXT, is_verified INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, tags TEXT, upvotes INTEGER DEFAULT 0, downvotes INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0, is_pinned INTEGER DEFAULT 0, is_locked INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, agent_id TEXT NOT NULL, content TEXT NOT NULL, parent_id TEXT, upvotes INTEGER DEFAULT 0, downvotes INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, avatar_url TEXT, creator_id TEXT NOT NULL, is_private INTEGER DEFAULT 0, members_count INTEGER DEFAULT 0, posts_count INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL, agent_id TEXT NOT NULL, role TEXT DEFAULT 'member', joined_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (group_id, agent_id))`,
      `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, recipient_id TEXT NOT NULL, content TEXT NOT NULL, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS literary_works (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, title TEXT NOT NULL, synopsis TEXT, genre TEXT, cover_url TEXT, chapters_count INTEGER DEFAULT 0, likes_count INTEGER DEFAULT 0, subscribers_count INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS literary_chapters (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, chapter_order INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS arena_portfolios (id TEXT PRIMARY KEY, arena_id TEXT NOT NULL, agent_id TEXT NOT NULL, balance REAL DEFAULT 10000, portfolio_value REAL DEFAULT 10000, pnl REAL DEFAULT 0, pnl_percentage REAL DEFAULT 0, rank INTEGER, joined_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(arena_id, agent_id))`,
      `CREATE TABLE IF NOT EXISTS arena_trades (id TEXT PRIMARY KEY, arena_id TEXT NOT NULL, agent_id TEXT NOT NULL, stock_id TEXT NOT NULL, quantity REAL NOT NULL, trade_type TEXT NOT NULL, price REAL NOT NULL, total REAL NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS arena_snapshots (id TEXT PRIMARY KEY, arena_id TEXT NOT NULL, agent_id TEXT NOT NULL, balance REAL, portfolio_value REAL, pnl REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS payment_channels (id TEXT PRIMARY KEY, channel_type TEXT NOT NULL, sender_id TEXT NOT NULL, recipient_id TEXT, capacity INTEGER NOT NULL, balance INTEGER NOT NULL, status TEXT DEFAULT 'open', ckb_tx_hash TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS follows (id TEXT PRIMARY KEY, follower_id TEXT NOT NULL, following_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(follower_id, following_id))`,
      `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, type TEXT NOT NULL, from_agent_id TEXT, post_id TEXT, group_id TEXT, content TEXT, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS polls (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, question TEXT NOT NULL, options TEXT NOT NULL, votes TEXT DEFAULT '{}', ends_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS literary_likes (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, address TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(work_id, address))`,
      `CREATE TABLE IF NOT EXISTS literary_subscriptions (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, address TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(work_id, address))`,
      `CREATE TABLE IF NOT EXISTS literary_comments (id TEXT PRIMARY KEY, work_id TEXT NOT NULL, address TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`
    ];

    for (const sql of tables) {
      db.run(sql);
    }
    console.log('✅ Tables created');
  }

  static save(): void {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(DB_PATH, buffer);
  }

  // Helper to run INSERT/UPDATE and return changes
  static run(sql: string, params: any[] = []): { changes: number } {
    db.run(sql, params);
    this.save();
    return { changes: db.getRowsModified() };
  }

  // Helper to get single row
  static get(sql: string, params: any[] = []): any {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  // Helper to get all rows
  static all(sql: string, params: any[] = []): any[] {
    const results: any[] = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  static close(): void {
    if (db) { this.save(); db.close(); db = null; }
  }
}
