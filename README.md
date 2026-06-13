# MailForge — Self-Hosted Email Marketing

A full-featured email marketing platform you can run on your own machine. Built as a self-hosted alternative to Constant Contact, powered by [Postmark](https://postmarkapp.com) for email delivery and [Claude AI](https://anthropic.com) for AI-generated templates.

## Features

- **Drag-and-drop email builder** — visual block editor with live HTML preview
- **AI Template Maker** — generate professional email templates using Claude AI
- **Campaign management** — create, schedule, and send campaigns to contact lists
- **Contact management** — import via CSV, organize into lists, track status
- **Template library** — save and reuse email designs; create from scratch or AI
- **Preview modals** — click any campaign or template to preview before sending
- **Test sends** — send a test email to yourself before going live
- **Scheduled sending** — pick a date/time to send automatically
- **Analytics dashboard** — open rates, click rates, bounce tracking via Postmark webhooks
- **Sign-up forms** — embeddable HTML forms with a public subscribe endpoint
- **Template Groups** — drip-style sequences where each template sends on its own schedule
- **Settings** — configure sender name/email, Postmark API key, message stream

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | SQLite via `better-sqlite3` (WAL mode, single file) |
| Auth | JWT (`jose`), httpOnly cookie, bcrypt password hashing |
| Email | Postmark API (`postmark` npm package) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Charts | `recharts` |
| Icons | `lucide-react` |

## Quick Start

### Prerequisites
- Node.js 18+
- A [Postmark](https://postmarkapp.com) account with a verified sender signature
- (Optional) An [Anthropic](https://console.anthropic.com) API key for AI templates

### 1. Clone & install

```bash
git clone https://github.com/iamabhijit123/mailforge.git
cd mailforge
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
JWT_SECRET=your-secret-key-at-least-32-characters-long
NEXT_PUBLIC_APP_URL=http://localhost:3000
POSTMARK_API_KEY=your-postmark-server-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

> **Note:** `.env.local` is in `.gitignore` and will never be committed.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and you're in.

### Windows — double-click launch

Use the included `start.bat` in the parent folder to launch the app and open your browser automatically.

## First-time Setup

1. **Register** an account at `/register`
2. Go to **Settings** → enter your Postmark API key and sender email/name
3. Go to **Contacts** → add contacts manually or import a CSV
4. Create a **List** and add contacts to it
5. Create a **Template** (visual builder or AI maker)
6. Create a **Campaign**, pick your list, and send

## Project Structure

```
email-marketing-app/
├── app/
│   ├── (dashboard)/          # All authenticated pages
│   │   ├── dashboard/        # Stats overview
│   │   ├── contacts/         # Contact management
│   │   ├── lists/            # Contact lists
│   │   ├── campaigns/        # Campaign editor + list
│   │   ├── templates/        # Template library + AI maker
│   │   ├── analytics/        # Charts and reports
│   │   ├── forms/            # Embeddable sign-up forms
│   │   └── settings/         # App configuration
│   └── api/                  # REST API routes
├── components/
│   ├── email-builder/        # Drag-and-drop editor
│   └── ui/                   # Shared UI components
├── lib/
│   ├── db.ts                 # SQLite init + schema
│   ├── auth.ts               # JWT helpers
│   ├── postmark.ts           # Email sending
│   └── email-html.ts         # Block → HTML generator
├── public/
│   └── template-maker/       # AI Template Maker (standalone page in iframe)
└── data/                     # SQLite database (gitignored)
```

## Email Delivery

This app uses **Postmark** for all email sending:

- **Transactional stream (`outbound`)** — used for test sends
- **Broadcast stream (`broadcast`)** — used for campaign sends to lists

Make sure your Postmark sender signature is verified and your broadcast stream is configured before sending campaigns.

## Security Notes

- `.env.local` (API keys) is excluded from git
- `data/` (SQLite database with user data) is excluded from git
- Passwords are hashed with bcrypt
- Auth tokens are httpOnly cookies (not accessible to JavaScript)
- All API routes verify the session before any database access

## License

Private — for internal use.
