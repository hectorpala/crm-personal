import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// Database path - use volume in production
const dbPath = process.env.DATABASE_PATH || 'crm.db'

// Ensure directory exists
const dbDir = dirname(dbPath)
if (dbDir !== '.' && !existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

// Initialize database with default data
export function initializeDatabase() {
  // Create tables if not exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_sheet_row_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      address TEXT,
      category TEXT DEFAULT 'prospecto',
      tags TEXT DEFAULT '[]',
      avatar_url TEXT,
      score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      color TEXT DEFAULT '#94a3b8'
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id),
      title TEXT NOT NULL,
      value REAL DEFAULT 0,
      probability INTEGER DEFAULT 50,
      stage TEXT DEFAULT 'Lead',
      expected_close_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id),
      type TEXT DEFAULT 'nota',
      subject TEXT,
      content TEXT NOT NULL,
      direction TEXT DEFAULT 'saliente',
      channel TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contacts(id),
      opportunity_id INTEGER REFERENCES opportunities(id),
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'media',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      channel TEXT NOT NULL,
      variables TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_id INTEGER REFERENCES message_templates(id),
      channel TEXT NOT NULL,
      status TEXT DEFAULT 'borrador',
      scheduled_at TEXT,
      sent_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT
    );
  `)

  // Add missing columns (migrations for schema updates)
  const migrations = [
    // Contacts table columns
    "ALTER TABLE contacts ADD COLUMN lead_source TEXT",
    "ALTER TABLE contacts ADD COLUMN last_contact_date TEXT",
    "ALTER TABLE contacts ADD COLUMN notes TEXT",
    // Opportunities table columns
    "ALTER TABLE opportunities ADD COLUMN next_followup TEXT",
    // Tasks table columns
    "ALTER TABLE tasks ADD COLUMN google_calendar_event_id TEXT",
  ]

  for (const migration of migrations) {
    try {
      sqlite.exec(migration)
    } catch (e: any) {
      // Ignore "duplicate column" errors
      if (!e.message.includes('duplicate column')) {
        console.error('Migration error:', e.message)
      }
    }
  }

  // Insert default pipeline stages if empty
  const stagesCount = sqlite.prepare('SELECT COUNT(*) as count FROM pipeline_stages').get() as { count: number }
  if (stagesCount.count === 0) {
    sqlite.exec(`
      INSERT INTO pipeline_stages (name, "order", color) VALUES
        ('Lead', 1, '#94a3b8'),
        ('Contactado', 2, '#60a5fa'),
        ('Propuesta', 3, '#fbbf24'),
        ('Negociacion', 4, '#f97316'),
        ('Cerrado', 5, '#22c55e');
    `)
  }

  console.log('Database initialized at: ' + dbPath)
}

// Initialize on import
initializeDatabase()
