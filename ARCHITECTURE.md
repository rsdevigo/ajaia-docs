# Architecture

## Stack and why

- **Next.js 15 (App Router) + TypeScript:** pages and API routes in one deployable app.
- **Postgres (Neon) + Prisma:** sharing is relational; Neon's free tier hosts the demo.
- **Tiptap 3:** the required formatting, with a documented JSON format.
- **Signed cookie (`jose`):** three seeded users need login, not an identity system. No session table.
- **`zod`, Vitest, Tailwind:** validation, tests, styling.

## Data model

**User** (unique email, name, bcrypt hash), **Document** (title up to 200 characters, Tiptap JSON in a `Json` column, owner, timestamps), **DocumentShare** (document, user, role `VIEWER` or `EDITOR`; unique per pair; deleted with its document). Ownership is on the document; everyone else gets a share row. The schema is applied with `prisma db push`.

## Access control

All decisions live in [lib/access.ts](lib/access.ts): a pure `resolveAccess` returns `owner`, `editor`, `viewer` or `null`, and `canRead`, `canEdit`, `canManageSharing`, `canDelete` map that to permissions. Every `/api/documents/[id]/...` route calls one guard, `authorizeDocument`: 401 if not signed in, 404 if the document is missing or not visible, 403 if visible but the role is too low. The UI hides controls by role; the server enforces it. Middleware only checks for a valid session.

## Content format

Tiptap/ProseMirror JSON, not HTML or Markdown: it round-trips exactly with the editor, has a schema to validate against, and avoids sanitizing HTML on every render. The cost is coupling to the editor's schema.

## Import pipeline

1. The browser uploads the file to `POST /api/documents/import`.
2. The server checks size, extension and content (UTF-8 for text; zip signature and a `mammoth` parse for `.docx`), converts to HTML (`.txt` escaped, `.md` via `marked`, `.docx` via `mammoth`), sanitizes with an allow-list, and returns `{ title, html }`.
3. The browser converts the HTML with `generateJSON` and the editor's own extension list ([lib/editor-extensions.ts](lib/editor-extensions.ts)), which drops markup the editor cannot hold. It runs in the browser because it needs a DOM. The document is then created through `POST /api/documents`, which validates again.

The original file is not kept; that would need blob storage.

## Security decisions

- **404 instead of 403 for inaccessible documents.** No access looks the same as a nonexistent id, so ids cannot be probed. 403 only when the document is visible but the role is too low.
- **Content validated against the editor's schema.** A shape check (allowed node and mark names, depth cap), then the editor's own schema, with a ~1 MB cap (413). Review found the first version checked names only and accepted structurally invalid documents; a failing test reproduced it before the fix.
- **Sanitized imports.** An allow-list on the server (no scripts, event handlers, images or `javascript:` links), then the editor schema again in the browser.
- **Errors and login.** Unexpected failures return JSON `{ "error" }` with 500 and log details server-side only. Login returns a generic 401; the cookie is HttpOnly, SameSite=Lax, Secure in production.
- **Left open on purpose:** no login rate limiting; sharing says "No user with that email", revealing whether an account exists; the demo password is public.

## Priorities

Deployed to Vercel with Neon within the first hour, right after auth, on purpose: a live URL is required and that is where deployments usually go wrong. Then editor, sharing and import, with server-side access control and honest autosave (`Saved` only after success) ahead of polish.

## Scope cuts

- **Real-time collaboration:** too large for the budget; saves are last-write-wins.
- **OAuth, registration, password reset:** not needed to demonstrate documents and sharing.
- **Storing uploads:** needs blob storage.
- **Comments, version history:** outside the core flow; history also needs a revision model and UI.

## Known limitations

- Last-write-wins: a later save overwrites an earlier one silently.
- An editor open elsewhere is not told its access changed; its next save fails.
- Sessions cannot be revoked server-side; a token lasts up to 7 days.
- Import drops images and table structure; no `.doc` or `.pdf`.
- No automated tests for the share routes, editor UI or the browser half of import.
- No migration history, dashboard pagination or search.
