import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Determine data directory: honour explicit override, then detect platform
function resolveDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  if (process.env.VERCEL) return '/tmp/mailforge-data'
  // Railway and other cloud platforms that may have a read-only project root
  if (process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT) return '/tmp/mailforge-data'
  const local = path.join(process.cwd(), 'data')
  try {
    if (!fs.existsSync(local)) fs.mkdirSync(local, { recursive: true })
    // Quick write test to confirm the path is writable
    fs.accessSync(path.dirname(local), fs.constants.W_OK)
    return local
  } catch {
    return '/tmp/mailforge-data'
  }
}

const DATA_DIR = resolveDataDir()
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
      anthropic_api_key TEXT,
      phone TEXT,
      timezone TEXT,
      signature_image_url TEXT,
      privacy_policy_url TEXT,
      footer_show_update_profile INTEGER DEFAULT 1,
      footer_show_unsubscribe_comment INTEGER DEFAULT 1,
      footer_fine_print TEXT,
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

  // contact_notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_contact_notes ON contact_notes(contact_id);
  `)

  // team_members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      member_user_id TEXT,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'pending',
      invite_token TEXT UNIQUE,
      invited_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_team_members_owner ON team_members(owner_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_token ON team_members(invite_token);
  `)

  // Template folders
  try { db.exec(`CREATE TABLE IF NOT EXISTS template_folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`) } catch {}

  // Recurring campaigns
  try { db.exec(`CREATE TABLE IF NOT EXISTS recurring_campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    reply_to TEXT,
    cc_emails TEXT DEFAULT '[]',
    list_ids TEXT DEFAULT '[]',
    template_folder_id TEXT,
    frequency TEXT NOT NULL DEFAULT 'weekly',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    send_time TEXT NOT NULL DEFAULT '09:00',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    rotation_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`) } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS recurring_sends (
    id TEXT PRIMARY KEY,
    recurring_campaign_id TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    template_id TEXT,
    campaign_id TEXT,
    status TEXT DEFAULT 'pending',
    is_adjusted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (recurring_campaign_id) REFERENCES recurring_campaigns(id) ON DELETE CASCADE
  )`) } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_recurring_sends_scheduled ON recurring_sends(scheduled_at, status)`) } catch {}

  // Migrations: add columns that may not exist in older databases
  try { db.exec(`ALTER TABLE settings ADD COLUMN anthropic_api_key TEXT`) } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN workspace_id TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN zerobounce_api_key TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN monday_api_key TEXT`) } catch {}
  try { db.exec(`ALTER TABLE template_group_items ADD COLUMN item_list_id TEXT`) } catch {}
  try { db.exec(`ALTER TABLE template_group_items ADD COLUMN recipient_email TEXT`) } catch {}
  try { db.exec(`ALTER TABLE campaigns ADD COLUMN scheduled_at TEXT`) } catch {}
  try { db.exec(`ALTER TABLE campaigns ADD COLUMN cc_emails TEXT DEFAULT '[]'`) } catch {}
  try { db.exec(`ALTER TABLE templates ADD COLUMN folder_id TEXT`) } catch {}

  // New settings columns
  try { db.exec(`ALTER TABLE settings ADD COLUMN phone TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN timezone TEXT DEFAULT 'America/New_York'`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN signature_image_url TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN privacy_policy_url TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN footer_show_update_profile INTEGER DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN footer_show_unsubscribe_comment INTEGER DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN footer_fine_print TEXT`) } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`) } catch {}

  // is_workspace_owner: explicit flag to track who owns a workspace (separate from workspace_id)
  // NULL/undefined = original owner logic (backward compat), 1 = owner, 0 = member
  try { db.exec(`ALTER TABLE users ADD COLUMN is_workspace_owner INTEGER DEFAULT NULL`) } catch {}
  // Backfill: existing users with workspace_id=NULL are owners, others are members
  try { db.exec(`UPDATE users SET is_workspace_owner = 1 WHERE workspace_id IS NULL AND is_workspace_owner IS NULL`) } catch {}
  try { db.exec(`UPDATE users SET is_workspace_owner = 0 WHERE workspace_id IS NOT NULL AND is_workspace_owner IS NULL`) } catch {}

  // Password reset tokens
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `) } catch {}

  // Admin settings (global key-value store for SaaS master config)
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `) } catch {}

  // Domain verifications — Postmark DKIM/Return-Path per workspace
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS domain_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      postmark_domain_id TEXT,
      dkim_host TEXT,
      dkim_value TEXT,
      dkim_verified INTEGER DEFAULT 0,
      return_path_host TEXT,
      return_path_value TEXT,
      return_path_verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      verified_at TEXT,
      UNIQUE(domain),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `) } catch {}

  // SaaS account control columns
  try { db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN is_disabled INTEGER DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN api_access_enabled INTEGER DEFAULT 1`) } catch {}

  // Admin invites — for inviting new workspace owners from the admin panel
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS admin_invites (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      used_at TEXT
    )
  `) } catch {}

  // Recurring campaigns — single template option
  try { db.exec(`ALTER TABLE recurring_campaigns ADD COLUMN template_id TEXT`) } catch {}
  try { db.exec(`ALTER TABLE recurring_campaigns ADD COLUMN template_ids TEXT`) } catch {}

  // Settings columns added after initial schema
  try { db.exec(`ALTER TABLE settings ADD COLUMN anthropic_api_key TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN phone TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN timezone TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN signature_image_url TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN privacy_policy_url TEXT`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN footer_show_update_profile INTEGER DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN footer_show_unsubscribe_comment INTEGER DEFAULT 1`) } catch {}
  try { db.exec(`ALTER TABLE settings ADD COLUMN footer_fine_print TEXT`) } catch {}

  // Auto-grant admin to first workspace owner if no admins exist yet
  try {
    const adminCount = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE is_admin = 1`).get() as { c: number }).c
    if (adminCount === 0) {
      db.exec(`UPDATE users SET is_admin = 1 WHERE id = (
        SELECT id FROM users WHERE (workspace_id IS NULL OR is_workspace_owner = 1) ORDER BY created_at ASC LIMIT 1
      )`)
    }
  } catch {}

  // Remove self-invite duplicates: team_members rows where email matches the owner's own email
  try {
    db.exec(`
      DELETE FROM team_members
      WHERE id IN (
        SELECT tm.id FROM team_members tm
        JOIN users u ON u.id = tm.owner_id
        WHERE lower(tm.email) = lower(u.email)
      )
    `)
  } catch {}

  // Resend to non-openers: track resend waves and their recipients
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_resends (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      wave_number INTEGER NOT NULL DEFAULT 2,
      status TEXT DEFAULT 'sent',
      sent_count INTEGER DEFAULT 0,
      unique_opens INTEGER DEFAULT 0,
      unique_clicks INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `) } catch {}
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_resend_recipients (
      id TEXT PRIMARY KEY,
      resend_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      postmark_message_id TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    )
  `) } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_crr_resend_id ON campaign_resend_recipients(resend_id)`) } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_crr_contact_email ON campaign_resend_recipients(contact_email)`) } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_campaign_resends_campaign ON campaign_resends(campaign_id)`) } catch {}

  // Auto-resend support for scheduled campaigns
  try { db.exec(`ALTER TABLE scheduled_campaigns ADD COLUMN auto_resend_after_hours INTEGER DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE scheduled_campaigns ADD COLUMN is_auto_resend INTEGER DEFAULT 0`) } catch {}
}

// Re-creates the user row if the DB was wiped (e.g. Railway redeploy resets /tmp).
// Called automatically by getSession() so no API route changes are needed.
export function ensureUser(user: { id: string; email: string; name: string }): void {
  try {
    getDb().prepare(
      `INSERT OR IGNORE INTO users (id, email, name, password_hash) VALUES (?, ?, ?, 'jwt-authenticated')`
    ).run(user.id, user.email, user.name)
  } catch {
    // non-fatal — if this fails the downstream FK error will surface as before
  }
}
