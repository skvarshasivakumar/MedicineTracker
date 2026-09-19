import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { openWebDatabaseShim } from './webShim';

let _db: SQLite.SQLiteDatabase | null = null;
let _schemaReady = false;

function ensureDbInstance(): SQLite.SQLiteDatabase {
  if (!_db) {
    if (Platform.OS === 'web') {
      _db = openWebDatabaseShim() as unknown as SQLite.SQLiteDatabase;
    } else {
      _db = SQLite.openDatabaseSync('medtracker.db');
      _db.execSync('PRAGMA foreign_keys = ON;');
    }
  }
  return _db;
}

export function getDb(): SQLite.SQLiteDatabase {
  const db = ensureDbInstance();
  if (!_schemaReady) {
    try {
      initDb();
    } catch (e) {
      console.warn('[db] lazy init failed', e);
    }
  }
  return db;
}

/** Run all schema + safe migrations. Idempotent on every launch. */
export function initDb(): void {
  const db = ensureDbInstance();
  if (_schemaReady) return;

  db.execSync(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      caregiver_phone TEXT
    );

    CREATE TABLE IF NOT EXISTS medicine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      notify_style TEXT NOT NULL DEFAULT 'name',
      frequency_type TEXT NOT NULL DEFAULT 'daily',
      weekdays TEXT,
      month_day INTEGER,
      food_relation TEXT NOT NULL DEFAULT 'any',
      stock_count INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      voice_clip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL,
      shift TEXT NOT NULL,
      time_hhmm TEXT NOT NULL,
      dose_qty INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminder_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      snooze_count INTEGER NOT NULL DEFAULT 0,
      renotify_count INTEGER NOT NULL DEFAULT 0,
      responded_at TEXT,
      notification_id TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedule(id) ON DELETE CASCADE,
      FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_event_due ON reminder_event(due_at);
    CREATE INDEX IF NOT EXISTS idx_event_status ON reminder_event(status);

    CREATE TABLE IF NOT EXISTS appointment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_name TEXT NOT NULL,
      when_at TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notification_id TEXT
    );

    CREATE TABLE IF NOT EXISTS setting (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  _schemaReady = true;
}
