# Ajaia Docs

A small document editor in the spirit of Google Docs: create, rename, edit and share rich-text documents, and import `.txt`, `.md` or `.docx` files as new documents. Built for the Ajaia Full Stack Product Engineer assignment within a ~4 hour timebox.

- **Live app:** `https://ajaia-docs-indol.vercel.app/`
- **Architecture and decisions:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Submission checklist:** [SUBMISSION.md](SUBMISSION.md)

## What it does

- Sign in with one of three seeded accounts (no registration).
- Create, rename (click the title), edit and delete documents. Editing autosaves after 800 ms and shows `Saving…`, `Saved` or `Save failed – retry`. `Saved` appears only after the server confirms the write.
- Formatting: bold, italic, underline, H1, H2, bullet and numbered lists, undo and redo, with keyboard shortcuts.
- Share a document with another seeded user by email as **Editor** or **Viewer**. The owner can change or remove access. Viewers get a read-only editor with a "View only" badge.
- The dashboard separates **My documents** from **Shared with me**. Shared documents show the owner and your role.
- Import a file as a new document you own (see below).
- **Export as Markdown** (extra feature): anyone who can open a document, including viewers, can download it as `<title>.md`. Headings, bold, italic, lists (nested and numbered), links, quotes and code are converted; **underline has no Markdown equivalent and is exported as plain text**. The export reflects what is on screen, including edits not yet saved.
- Work persists in Postgres, so documents survive refresh and re-login.

## Demo accounts

| Email | Password |
|---|---|
| alice@ajaia.test | demo1234 |
| bob@ajaia.test | demo1234 |
| carol@ajaia.test | demo1234 |

The seed also creates one document owned by Alice and shared with Bob as Editor, so sharing can be tried right away. The password is public on purpose for this demo.

## Run locally

Requirements: Node 20.19 or newer (developed on Node 24) and a Postgres database. It was built against [Neon](https://neon.tech) (free tier). For a plain local Postgres, set both URLs below to the same connection string (not tested).

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the three values below
npm run db:push             # create the tables
npm run db:seed             # create the demo users and document
npm run dev                 # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`), used by the app |
| `DIRECT_URL` | Neon **direct** connection string, used by Prisma for `db push` |
| `SESSION_SECRET` | Random string of 32+ characters that signs the session cookie, e.g. `openssl rand -base64 32` |

`npm run db:seed` is safe to run again: it never changes existing users or edits to the demo document.

## Tests and build

```bash
npm test          # 38 tests, no database needed
npm run build
```

The tests cover the access-control rules (owner / editor / viewer / no access against read, edit, manage sharing, delete), a route-level test of `PATCH /api/documents/[id]` with auth and the database mocked, document-content validation, session tokens, the three import converters (including a real `.docx` fixture in [tests/fixtures](tests/fixtures)), and the Markdown export converter.

## File import

Choose **Import file** on the dashboard or drag a file onto it. A new document is created with the file name (without extension) as its title.

- **Supported:** `.txt`, `.md`, `.docx` only, up to **2 MB**.
- `.txt`: blank-line-separated blocks become paragraphs.
- `.md`: headings, emphasis, lists and links are kept. Code blocks and quotes are kept as content, but the editor has no toolbar buttons or styling for them.
- `.docx`: headings, bold, italic, underline and lists are kept.
- **Dropped:** images, and table structure (the text of table cells is kept as paragraphs). Links are kept only for `http`, `https` and `mailto`.
- The toolbar and editor styling cover H1 and H2 only; deeper headings in an imported file are kept as headings but have no styling.
- The original file is not stored. Only the converted content is kept.
- Unsupported types return 415, files over 2 MB return 413, and unreadable or empty content returns 400, each with a message.

## Project layout

```
app/          pages and API routes (Next.js App Router)
components/   editor, toolbar, share dialog, import and dashboard widgets
lib/          access control, auth/session, validation, import converters
prisma/       schema and seed
tests/        route-level test and the .docx fixture
```

## Deploying

Vercel plus Neon. Set `DATABASE_URL`, `DIRECT_URL` and `SESSION_SECRET` in the Vercel project, then run `npm run db:push` and `npm run db:seed` from a machine with the production URLs exported as environment variables.
