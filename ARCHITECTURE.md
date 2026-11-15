# Architecture

## Stack and why

| Choice | Reason |
|---|---|
| Next.js 15 (App Router) + TypeScript | One deployable app for pages and API routes; fastest path to a live URL on Vercel. |
| Postgres (Neon) + Prisma | Sharing is relational (users, documents, per-user roles). Neon's free tier covers the hosted demo. |
| Tiptap 3 (StarterKit) | Gives the required formatting with a documented JSON format; no editor to build from scratch. |
| Signed cookie session (`jose`) | Three seeded users need login, not an identity system. Stateless, no session table. |
| `zod`, Vitest, Tailwind | Input validation, tests, styling. Nothing else was added without a reason. |

## Data model

- **User**: `email` (unique), `name`, `passwordHash` (bcrypt).
- **Document**: `title` (max 200), `content` (Tiptap JSON in a `Json` column), `ownerId`, timestamps.
- **DocumentShare**: `documentId`, `userId`, `role` (`VIEWER` or `EDITOR`), unique on `(documentId, userId)`. Deleted with its document.

Ownership lives on the document; everyone else gets a share row. The schema is applied with `prisma db push`; there is no migration history.

## Access control

All document decisions go through [lib/access.ts](lib/access.ts). `resolveAccess` is a pure function returning `owner`, `editor`, `viewer` or `null`; `getDocumentAccess` loads the owner and the caller's share row and applies it. `canRead`, `canEdit`, `canManageSharing` and `canDelete` map a level to a permission.

Every `/api/documents/[id]/...` route calls one guard, `authorizeDocument` ([lib/api.ts](lib/api.ts)), which returns 401 (not signed in), 404 (missing **or** not visible to you) or 403 (visible, but your role is too low). The UI hides controls by role, but the server is what enforces it. The dashboard list is scoped by query (documents you own plus your share rows). Middleware only checks that a valid session exists.

## Content format

Documents are stored as Tiptap/ProseMirror JSON, not HTML or Markdown. It round-trips exactly with the editor, has an explicit schema that can be validated, and avoids storing HTML that has to be sanitized on every render. The cost is that content is tied to the editor's schema.

## Import pipeline

1. The browser uploads the file to `POST /api/documents/import`.
2. The server checks size and extension, then checks the content (UTF-8 and no binary data for text; zip signature and a successful `mammoth` parse for `.docx`).
3. It converts to HTML (`.txt` by escaping and splitting paragraphs, `.md` with `marked`, `.docx` with `mammoth`) and sanitizes it with an allow-list. It returns `{ title, html }`.
4. The browser turns the HTML into Tiptap JSON with `generateJSON`, using the same extension list as the editor ([lib/editor-extensions.ts](lib/editor-extensions.ts)), so markup the editor cannot hold is dropped. This step runs in the browser because it needs a DOM.
5. The browser creates the document with `POST /api/documents`, which validates the content again.

The original file is not kept. Import is a one-way conversion; storing uploads would need blob storage, which was out of scope.

## Security and review decisions

- **404 instead of 403 for inaccessible documents.** A user with no access gets the same "Document not found" as for an id that does not exist, so ids cannot be probed. 403 is only used when the user can see the document but lacks the role (for example a viewer attempting an edit).
- **Content validated against the editor's schema.** Stored content must pass a shape check (allowed node and mark names, depth cap) and then the editor's own schema, so a document the editor cannot load cannot be saved through the API. Request bodies are capped at about 1 MB (413). This was found in review: the first version checked node names only and accepted structurally invalid documents. It was reproduced with a failing test before the fix.
- **Sanitized imports.** Imported HTML goes through an allow-list (no scripts, event handlers, images or `javascript:` links) on the server, and the editor's schema filters it again in the browser. Text is HTML-escaped for `.txt`.
- **Errors never leak internals.** The login, document, share and import routes are wrapped so unexpected failures return `{ "error": "..." }` with status 500; details are logged on the server only.
- **Login:** generic 401 for a wrong email or password, with a dummy bcrypt comparison for unknown emails to keep timing similar. The cookie is HttpOnly, SameSite=Lax, and Secure in production.
- **Seed is safe to re-run** against a live database: it never resets users or undoes changes to the demo document.

**Reviewed and deliberately not fixed:**

- No rate limiting on login. A demo with three known accounts; a real deployment needs it.
- Sharing reports "No user with that email", which reveals whether an address has an account. Sharing by email needs some feedback, and with three seeded users there is little to protect.
- The demo password is public (shown on the login page and in this repo) so reviewers can sign in.

## What I prioritized

1. A working vertical path first (login, then documents and the editor, then sharing, then import), so each step could be tested before the next.
2. Server-side access control and its tests, because sharing is the part where mistakes matter.
3. Autosave that is honest about failure: `Saved` appears only after a successful response, failed changes are kept for retry, and pending changes are flushed when leaving the page.
4. A safe import path (validation, sanitizing, shared schema) over wide format support.
5. Visual polish last. The UI is functional and plain.

## Deliberate scope cuts

- **Real-time collaboration:** large effort (CRDT or OT plus transport) for a 4-hour budget; saves are last-write-wins instead.
- **OAuth, registration, password reset:** not needed to show documents and sharing; three seeded users instead.
- **Storing uploaded files:** would need blob storage; import converts into a document and keeps only that.
- **Comments:** outside the core create, edit, share flow.
- **Version history:** needs a revision model and a restore UI; not essential to the core flow.

## Known limitations

- **Last-write-wins.** If two people edit the same document, the later save overwrites the earlier one without warning.
- An editor open in another tab is not told when its access is removed or its role changes; its next save fails with `Save failed – retry`, and a role change needs a reload.
- Sessions cannot be revoked on the server; logout only clears the cookie, and a token stays valid until it expires (7 days).
- Import drops images and table structure, and does not accept `.doc` or `.pdf`.
- Tests do not cover the share routes, the editor UI, or the browser half of the import flow; those were verified by hand.
- No migration history (`db push`), no pagination or search on the dashboard.

## What I would build next (2–4 more hours)

1. Tests for the share routes and one browser test of the main path (sign in, edit, share, view as another user).
2. Login rate limiting, and a less revealing message when sharing with an unknown email.
3. Tell an open editor when its access was removed or changed, instead of failing at the next save.
4. Move from `db push` to Prisma migrations before changing the schema again.

Real-time editing (for example Yjs) would be the next larger step after these.
