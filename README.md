# Quad Encode

A study platform: search a topic, work through a ranked path of resources, take notes, and turn those notes into spaced-repetition recall prompts. See [CLAUDE.md](CLAUDE.md) for the full product and engineering spec.

Live: https://quadencode.netlify.app/

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Database: run [supabase/schema.sql](supabase/schema.sql) in a Supabase project's SQL editor. It creates the tables in section 6 of CLAUDE.md and enables row level security on all of them.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest unit tests

## Deploy

Netlify, connected to this repo, using `netlify.toml` and the official `@netlify/plugin-nextjs` plugin. Push to `main` to deploy. The two Supabase env vars above also need to be set in Netlify's site settings.

CI runs lint, typecheck, tests, and build on every push via `.github/workflows/ci.yml`.

## Current state

**Phase 0 (foundations) — done.** Repo, TypeScript strict mode, Tailwind, Supabase project with schema and RLS, Netlify deploy, CI pipeline.

**Phase 1 (auth and notes) — done.** Sign up (with name), sign in, sign out, Google OAuth, password reset, account deletion, protected routes (`/dashboard`, `/notes/[id]`, `/review`) via `src/proxy.ts`. A dashboard for creating subjects and notes. A markdown note editor with debounced autosave.

**Phase 2 (cards and review) — done.** `??`/`>>` pairs in a note become box-0 cards automatically on save (`src/lib/parseBlanks.ts`, wired into `updateNoteContent`). Cloze cards via selecting text and pressing Cmd+K (`createClozeCard`, no note markup involved). A Leitner scheduler (`src/lib/scheduler.ts`) — binary Correct/Wrong, box 0-5, matching the section 8 interval table exactly. The review screen (`/review`) shows box-0 cards first with Keep/Edit/Delete quality control, then due cards with instant-reveal Correct/Wrong, capped at 20 cards per session, ending on a completion screen. A failed review's card carries a "Jump to note" link back to its source line. Three failures on a card append "Explain this a different way" as a new open prompt under `## Open questions` in the note. The Review entry point on the dashboard only appears once the user has at least one card, per section 3.

Next: Phase 3 (imports).
