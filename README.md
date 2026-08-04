# Quad Encode

A study platform: search a topic, work through a ranked path of resources, take notes, and turn those notes into spaced-repetition recall prompts. See [CLAUDE.md](CLAUDE.md) for the full product and engineering spec.

Live: https://quadencode.netlify.app/

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in the Supabase vars, plus GEMINI_API_KEY, SERPER_API_KEY, and
# YOUTUBE_API_KEY for subject search/import/quiz generation to work.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

AI calls (`src/lib/ai.ts`) try Gemini first, then fall back to OpenAI (`OPENAI_API_KEY`) if Gemini is rate-limited, overloaded, or unset — so one flaky key doesn't take down imports, quiz generation, or path search. OpenAI is optional; without it, those features just retry Gemini alone.

Database: run [supabase/schema.sql](supabase/schema.sql) in a Supabase project's SQL editor. It creates the tables in section 6 of CLAUDE.md and enables row level security on all of them.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest unit tests

## Deploy

Netlify, connected to this repo, using `netlify.toml` and the official `@netlify/plugin-nextjs` plugin. Push to `main` to deploy. All the env vars above (Supabase, Gemini, Serper, YouTube, and optionally OpenAI) need to be set in Netlify's site settings too — `.env.local` only covers local dev.

CI runs lint, typecheck, tests, and build on every push via `.github/workflows/ci.yml`.

## Current state

**Phase 0 (foundations) — done.** Repo, TypeScript strict mode, Tailwind, Supabase project with schema and RLS, Netlify deploy, CI pipeline.

**Phase 1 (auth and notes) — done.** Sign up (with name), sign in, sign out, Google OAuth, password reset, account deletion, protected routes (`/dashboard`, `/notes/[id]`, `/review`) via `src/proxy.ts`. A dashboard for creating subjects and notes. A markdown note editor with debounced autosave, plus an inline PDF viewer when a note was imported from one.

**Phase 2 (cards and review) — done.** `**Vocab:**/**Def:**` pairs become front/back flip cards; `**Quiz:**/**A:**` pairs (pipe-separated options, first is correct) become multiple-choice cards — both auto-extracted on save (`src/lib/parseBlanks.ts`, wired into `updateNoteContent`). Cloze cards via selecting text and pressing Cmd+K (`createClozeCard`). A Leitner scheduler (`src/lib/scheduler.ts`) — binary Correct/Wrong, box 0-5, matching the section 8 interval table. The review screen (`/review`) offers a Flashcards/Quiz mode choice, shows box-0 cards first with Keep/Edit/Delete quality control, then due cards with instant-reveal Correct/Wrong or multiple-choice, capped at 5 cards per session, ending on a completion screen. A failed review's card carries a "Jump to note" link back to its source line. Three failures on a card append a new open Vocab/Def blank under `## Open questions` so the user re-explains the concept themselves. Quiz cards start life as `imported` tier (dashed, dimmed border, don't count toward progress); after two correct answers in a row, review prompts the user to re-explain the card in their own words and promotes it to `authored` tier, per section 4. The Review entry point on the dashboard only appears once the user has at least one card, per section 3.

**Phase 2.5 (practice and local quiz) — done.** The review completion screen shows correct/wrong counts plus missed prompts with jump-to-note links. A per-note Practice tab and a local Quiz tab (`src/lib/practice.ts`, `src/lib/quiz-parser.ts`) build questions straight from a note's own cards — vocab distractors pulled from the note's other definitions — entirely on-device with zero AI calls, so they never write to the Leitner schedule and never touch the AI quota below.

**Phase 3 (imports) — done.** Paste text, upload a PDF (text extracted locally via `pdf-parse`, original file kept and shown in-note with zoom), or upload a screenshot; Gemini (`GEMINI_API_KEY`, server-only, OpenAI fallback) turns the material into open Vocab and Quiz prompts — prompts only, never answers, per section 2. They land under a single `## Open questions` heading; filling in a Vocab blank is what promotes it to a card. Each import is recorded; an Imports history page appears on the dashboard after the first one. A note's AI-generated quiz can also be played on demand (`/notes/[id]`, Quiz tab), capped at 2 AI generations per rolling 24 hours per section 5 (`src/lib/quota.ts`), with remaining quota shown on the button.

**Phase 4 (discovery and paths) — done.** LLM-interpreted subject search on the public home page, usable signed out (`/study/[query]`). Serper for web results, YouTube Data API for videos and playlists — real video/playlist ids are extracted in code (`src/lib/youtube.ts`) rather than left for the model to guess, sorted newest-upload-first for every subject so a search always surfaces current information. Every candidate resource is checked for a live response (`src/lib/link-checker.ts`) before a path can be saved; broken links are discarded, not shown. Free resources are sorted ahead of paid in code, not left to the model's word. Saving a path or acting on it (`src/app/dashboard/actions.ts`) prompts sign-in for signed-out users.

Next: Phase 5 (polish — motion, accessibility, and performance passes across what's already shipped).
