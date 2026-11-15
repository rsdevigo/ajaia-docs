# AI Workflow Note
 
## Tools used
- **Claude (chat):** planning, scope critique, prompt design, and reviewing the coding agent's reports between steps.
- **Claude Code (coding agent):** implementation, tests, a review pass, and first drafts of the docs. A `CLAUDE.md` set the stack and the rules: access checks only through one module, build and tests must pass, one commit per task, and the deliberate scope cuts.
I worked in scoped prompts: plan → scaffold → auth + deploy → editor → sharing → import → tests/review → docs → Markdown export. Each prompt had acceptance criteria. After each step I ran a manual check and logged it in `ai-log.md` (in the repo) before moving on.
 
## Where AI materially sped things up
- **Scaffolding and wiring:** Prisma schema, seed, JWT cookie auth, and zod-validated API routes.
- **Import pipeline:** mammoth, marked, and sanitize-html, with content checks beyond the file extension and a real `.docx` test fixture.
- **Tests:** 38 in total, including a table-driven access matrix and a route-level PATCH test with mocked auth and DB.
- **Stretch feature:** Export as Markdown came together in one step, because I had finished the core early. I kept the AI's decision to go beyond my brief (links, code, quotes, Markdown escaping), since imported `.md` files can contain those and dropping them silently would make the export wrong.
- **Review pass:** it found a real gap. Content validation only checked node names, so structurally invalid documents were accepted. It reproduced this with a failing test, then fixed it by validating against the editor's own schema.
## What I changed or rejected
- **Scope critique:** before writing code, I asked the AI to attack my plan. I accepted deploy-first and client-side HTML→Tiptap conversion. I **rejected** cutting the viewer/editor UI, and caught a made-up option name (`immediatelyexecute`) in that answer.
- **Dependency drift:** unpinned installs pulled TypeScript 7, which broke `next.config.ts`, and Vitest 5.1, which failed with "failed to find the runner". I reproduced both and pinned TS 5 and Vitest 3. Prisma was pinned to v6 to avoid v7's config changes mid-timebox.
- **Process miss:** the agent committed with my account email via `git -c` instead of asking for a git identity. I rewrote the history and made it use the repo's local config.
- **Spec corrections I verified, not assumed:** Tiptap v3's StarterKit already includes Underline (checked the type definitions). I kept 404 for both "missing" and "no access", so the app doesn't leak whether a document exists.
- **Deliberately not fixed:** login rate limiting, email enumeration on share, and the public demo password. All three are documented as scope decisions.
- **Docs:** I checked the AI-drafted README, ARCHITECTURE, and SUBMISSION against the running app and corrected claims it could not verify.
## How I verified correctness, UX, and reliability
- **Build and tests:** `npm run build` and `npm test` had to pass after every step.
- **Manual checks where the AI could only build and unit-test:** the AI flagged in its own reports what it could not verify, and I closed each gap by hand on the real database and live deployment:
  - formatting survives refresh;
  - offline → "Save failed – retry" → recovery;
  - Alice and Carol in two sessions: viewer is read-only, upgrade to editor, revoke → "Document not found";
  - an `.md` with `<script>`, `javascript:` links, `onerror`, and an iframe imports clean.
- **Highest-risk change:** after the stricter schema validation, I re-tested saves on imported, seeded, and new documents with nested lists, and re-checked the signed-out redirects, because that hardening touched the middleware.