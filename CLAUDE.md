# ajaia-docs: project context for Claude Code

## What this is
A hiring assignment for Ajaia (Full Stack Product Engineer). It is a lightweight collaborative document editor inspired by Google Docs, built under a strict ~4-hour timebox. Reviewers judge product judgment, scope discipline, and code clarity as much as features.

## Stack (do not change without asking)
- Next.js 15 App Router + TypeScript + Tailwind
- Prisma + Postgres (Neon free tier), deployed on Vercel
- Tiptap (StarterKit + Underline); document content stored as Tiptap JSON
- Auth: seeded users + signed HTTP-only cookie session (`jose`), no OAuth or registration
- Validation with zod; tests with Vitest

## Rules
- Keep scope tight. Do not add features I did not ask for. If you think something is missing, say so in one line instead of building it.
- All document access checks go through `lib/access.ts`. No route may skip it.
- API errors use the shape `{ error: string }` with correct status codes (400/401/403/404/413/415). Never leak stack traces.
- Prefer small, readable modules over abstractions. Minimize dependencies, and justify each new one in one line.
- After each task, run `npm run build` (and `npm test` once tests exist) and fix any failures before reporting back.
- After each task, make a git commit with a clear message describing what was done.
- End each task with: what changed, what I should verify manually, and any known limitations.

## Seeded demo accounts
alice@ajaia.test, bob@ajaia.test, carol@ajaia.test (password: demo1234)

## Deliberate scope cuts
These are intentional, so don't build them: real-time collaboration (last-write-wins instead), OAuth/registration/password reset, storing original uploaded files, comments, version history.