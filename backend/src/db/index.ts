import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initDb } from './schema';

let db: Database.Database;

export function getDb(): Database.Database {
  if (db) return db;

  let dbPath: string;

  if (process.env.DB_PATH) {
    dbPath = process.env.DB_PATH;
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } else {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'openclaw.db');
  }

  console.log(`[DB] Opening database at ${dbPath}`);
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Better concurrency

  // Initialize schema
  initDb(db);

  return db;
}
