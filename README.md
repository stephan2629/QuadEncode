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

**Phase 1 (auth and notes) — done.** Sign up, sign in, sign out, protected routes (`/dashboard`, `/notes/[id]`) via `src/proxy.ts`. A dashboard for creating subjects and notes. A markdown note editor with debounced autosave. No card machinery visible anywhere, per section 3.

Next: Phase 2 (cards and review).
