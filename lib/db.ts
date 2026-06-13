import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      postmark_api_key TEXT,
      postmark_message_stream TEXT DEFAULT 'broadcast',
      sender_name TEXT,
      sender_email TEXT,
      reply_to TEXT,
      company_name TEXT,
      company_address TEXT,
      website TEXT,
      logo_url TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      company TEXT,
      status TEXT DEFAULT 'subscribed',
      source TEXT DEFAULT 'manual',
      tags TEXT DEFAULT '[]',
      custom_fields TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, email),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_lists (
      contact_id TEXT NOT NULL,
      list_id TEXT NOT NULL,
      added_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (contact_id, list_id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'custom',
      subject TEXT,
      blocks TEXT DEFAULT '[]',
      html_body TEXT,
      is_system INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      preview_text TEXT,
      from_name TEXT NOT NULL,
      from_email TEXT NOT NULL,
      reply_to TEXT,
      list_ids TEXT DEFAULT '[]',
      blocks TEXT DEFAULT '[]',
      html_body TEXT,
      template_id TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_at TEXT,
      sent_at TEXT,
      total_recipients INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaign_stats (
      campaign_id TEXT PRIMARY KEY,
      sent INTEGER DEFAULT 0,
      delivered INTEGER DEFAULT 0,
      opens INTEGER DEFAULT 0,
      unique_opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      unique_clicks INTEGER DEFAULT 0,
      bounces INTEGER DEFAULT 0,
      unsubscribes INTEGER DEFAULT 0,
      spam_complaints INTEGER DEFAULT 0,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaign_recipients (
      campaign_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      postmark_message_id TEXT,
      sent_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (campaign_id, contact_id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_events (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      contact_id TEXT,
      contact_email TEXT NOT NULL,
      event_type TEXT NOT NULL,
      link_url TEXT,
      postmark_message_id TEXT,
      occurred_at TEXT DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_config TEXT DEFAULT '{}',
      steps TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      list_id TEXT,
      config TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      submissions INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS template_groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      list_id TEXT,
      from_name TEXT,
      from_email TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS template_group_items (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      subject TEXT,
      scheduled_at TEXT NOT NULL,
      sent_at TEXT,
      campaign_id TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (group_id) REFERENCES template_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scheduled_campaigns (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(user_id, email);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_tgi_scheduled ON template_group_items(scheduled_at, status);
    CREATE INDEX IF NOT EXISTS idx_sc_scheduled ON scheduled_campaigns(scheduled_at, status);
  `)

  // Migrations: add columns that may not exist in older databases
  try { db.exec(`ALTER TABLE settings ADD COLUMN anthropic_api_key TEXT`) } catch {}
}
