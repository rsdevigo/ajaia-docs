# Submission

## Links

- **Live app:** `https://ajaia-docs-indol.vercel.app/`
- **Repository:** `<REPO_URL>`
- **Demo video (3–5 min):** `<VIDEO_URL>`

## Checklist

| Item | Where | Status |
|---|---|---|
| Working app, source code | this repository | Done |
| Live deployment | `https://ajaia-docs-indol.vercel.app/` | Fill in the URL |
| README (setup, accounts, tests, import limits) | [README.md](README.md) | Done |
| Architecture note (1 page) | [ARCHITECTURE.md](ARCHITECTURE.md) | Done |
| AI workflow note | `AI_WORKFLOW.md` | To be written by the author from the log below |
| Log of AI-assisted steps (source for the note above) | [ai-log.md](ai-log.md) | Done (entries P0–P6) |
| Automated tests | `npm test`, 36 tests in [lib/](lib) and [tests/](tests) | Done |
| Demo video | `<VIDEO_URL>` | Fill in the URL |

## Test accounts

`alice@ajaia.test`, `bob@ajaia.test`, `carol@ajaia.test`, all with password `demo1234`. The seed creates one document owned by Alice and shared with Bob as Editor.

## Requirements and where they live

| Requirement | Status | Notes |
|---|---|---|
| Create, rename, edit, save, reopen documents | Works | Dashboard at `/`, editor at `/documents/[id]`. Rename by editing the title. Autosave after 800 ms. |
| Rich text: bold, italic, underline, headings, bullet and numbered lists | Works | H1 and H2 only; undo and redo included. |
| File upload that fits the product | Works | `.txt`, `.md`, `.docx` up to 2 MB become a new editable document. Images and table structure are dropped. |
| Sharing: owner, grant access, owned vs shared | Works | Share by email as Editor or Viewer; change or remove access; enforced on the server. Dashboard has "My documents" and "Shared with me". |
| Persistence across refresh | Works | Postgres (Neon). |
| Validation and error handling | Works | zod on request bodies, content validated against the editor schema, JSON `{ error }` responses with 400/401/403/404/413/415, visible save-failure state. |
| At least one meaningful automated test | Done | Access-control matrix, route-level PATCH test, content validation, session tokens, import converters. |

## Verification

- **Automated:** `npm test` (36 tests) and `npm run build` pass.
- **Manual, by the author:** click-throughs of editing and autosave, sharing and revocation across two users, import (including an XSS payload in a `.md`), and the stricter content validation are recorded in [ai-log.md](ai-log.md) (P3–P6).

## Partial or not done

- **Real-time collaboration:** not built; last-write-wins. Two people editing at once can overwrite each other.
- **Not built, by choice:** OAuth or registration, password reset, comments, version history, storing the uploaded original. See [ARCHITECTURE.md](ARCHITECTURE.md).
- **Access changes are not live:** an editor open in another tab learns its access was removed only when the next save fails.
- **No automated tests** for the share routes, the editor UI or the browser half of import.
- **Security items left open on purpose:** no login rate limiting, sharing reveals whether an email has an account, public demo password.
- **Import limits:** no `.doc` or `.pdf`; images and table structure are dropped.
- **Schema changes use `prisma db push`;** there is no migration history.

### What I would build next (2–4 more hours)

1. Tests for the share routes, and one browser test of the main path (sign in, edit, share, view as another user).
2. Login rate limiting, and a less revealing message when sharing with an unknown email.
3. Tell an open editor when its access was removed or changed, instead of failing at the next save.
4. Move from `db push` to Prisma migrations before the schema changes again.

Real-time editing (for example Yjs) would be the next larger step after these.
