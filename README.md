# Quad Encode

A study platform: search a topic, work through a ranked path of resources, take notes, and turn those notes into spaced-repetition recall prompts. See [CLAUDE.md](CLAUDE.md) for the full product and engineering spec.

Live: https://quadencode.netlify.app/

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router), TypeScript in strict mode |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Database, auth, storage | Supabase (Postgres, with row level security on every table) |
| Deploy | Netlify, via the official `@netlify/plugin-nextjs` plugin |
| Testing | Vitest for unit tests, Playwright for end-to-end |
| AI | Gemini (primary), OpenAI as a fallback (`src/lib/ai.ts`) |
| Search / video | Serper (web search), YouTube Data API v3 (video and playlist lookup) |
| Icons | Lucide |

All third-party calls run server-side (Server Actions or `/app/api/` routes) so API keys never reach the browser.

## Using the app

1. **Search** a topic on the home page, signed in or not. Gemini turns the query into a subject and a ranked path of resources (free ones ranked ahead of paid), each checked for a live link before it's saved.
2. **Take notes** in the per-note markdown editor at `/notes/[id]`. Autosave is debounced, so there's no save button.
3. **Mark up recall prompts** inline as you write:
   - `**Vocab:** term` / `**Def:** definition` becomes a flip card.
   - `**Quiz:** question` / `**A:** correct | wrong | wrong` (pipe-separated, first option is correct) becomes multiple choice.
   - Select any text and press Cmd+K (Ctrl+K on Windows) to turn it into a cloze card without leaving the editor.
4. **Import** existing material instead of retyping it: paste text, upload a PDF, or upload a screenshot. Imported material lands under an "Open questions" heading as prompts to fill in yourself.
5. **Review** at `/review` once at least one card exists (there's no review nav item before that). New cards show up first for a quick keep/edit/delete pass, then due cards on a Leitner schedule (box 0 through 5), capped at five cards a session. A missed card links straight back to the line in your note it came from.
6. **Practice** a single note's cards anytime from its Practice tab, or generate a quiz from a note's content on the Quiz tab, without touching the Leitner schedule.

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in the Supabase vars, plus GEMINI_API_KEY, SERPER_API_KEY, and
# YOUTUBE_API_KEY for subject search/import/quiz generation to work.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

AI calls (`src/lib/ai.ts`) try Gemini first, then fall back to OpenAI (`OPENAI_API_KEY`) if Gemini is rate-limited, overloaded, or unset, so one flaky key doesn't take down imports, quiz generation, or path search. OpenAI is optional; without it, those features just retry Gemini alone.

Database: run [supabase/schema.sql](supabase/schema.sql) in a Supabase project's SQL editor. It creates the tables in section 6 of CLAUDE.md and enables row level security on all of them.

## Scripts

- `npm run dev`: local dev server
- `npm run build`: production build
- `npm run lint`: ESLint
- `npm run typecheck`: `tsc --noEmit`
- `npm test`: Vitest unit tests

## Deploy

Netlify, connected to this repo, using `netlify.toml` and the official `@netlify/plugin-nextjs` plugin. Push to `main` to deploy. All the env vars above (Supabase, Gemini, Serper, YouTube, and optionally OpenAI) need to be set in Netlify's site settings too (`.env.local` only covers local dev).

CI runs lint, typecheck, tests, and build on every push via `.github/workflows/ci.yml`.

## Current state

**Phase 0 (foundations): done.** Repo, TypeScript strict mode, Tailwind, Supabase project with schema and RLS, Netlify deploy, CI pipeline.

**Phase 1 (auth and notes): done.** Sign up (with name), sign in, sign out, Google OAuth, password reset, account deletion, protected routes (`/dashboard`, `/notes/[id]`, `/review`) via `src/proxy.ts`. A dashboard for creating subjects and notes. A markdown note editor with debounced autosave, plus an inline PDF viewer when a note was imported from one.

**Phase 2 (cards and review): done.** `**Vocab:**/**Def:**` pairs become front/back flip cards; `**Quiz:**/**A:**` pairs (pipe-separated options, first is correct) become multiple-choice cards. Both are auto-extracted on save (`src/lib/parseBlanks.ts`, wired into `updateNoteContent`). Cloze cards via selecting text and pressing Cmd+K (`createClozeCard`). A Leitner scheduler (`src/lib/scheduler.ts`) with a binary Correct/Wrong rating, box 0-5, matching the section 8 interval table. The review screen (`/review`) offers a Flashcards/Quiz mode choice, shows box-0 cards first with Keep/Edit/Delete quality control, then due cards with instant-reveal Correct/Wrong or multiple-choice, capped at 5 cards per session, ending on a completion screen. A failed review's card carries a "Jump to note" link back to its source line. Three failures on a card append a new open Vocab/Def blank under `## Open questions` so the user re-explains the concept themselves. Quiz cards start life as `imported` tier (dashed, dimmed border, don't count toward progress); after two correct answers in a row, review prompts the user to re-explain the card in their own words and promotes it to `authored` tier, per section 4. The Review entry point on the dashboard only appears once the user has at least one card, per section 3.

**Phase 2.5 (practice and local quiz): done.** The review completion screen shows correct/wrong counts plus missed prompts with jump-to-note links. A per-note Practice tab and a local Quiz tab (`src/lib/practice.ts`, `src/lib/quiz-parser.ts`) build questions straight from a note's own cards (vocab distractors are pulled from the note's other definitions), entirely on-device with zero AI calls, so they never write to the Leitner schedule and never touch the AI quota below. Both tabs save progress to `sessionStorage` as you go, so a mid-session tab refresh resumes where you left off instead of restarting; a "Start over" control clears it on purpose.

**Phase 3 (imports): done.** Paste text, upload a PDF (text extracted locally via `pdf-parse`, original file kept and shown in-note with zoom), or upload a screenshot; Gemini (`GEMINI_API_KEY`, server-only, OpenAI fallback) turns the material into Vocab and Quiz prompts. They land under a single `## Open questions` heading. Answers may be pre-filled directly (imports and AI generation are no longer required to leave them blank, a product decision documented in CLAUDE.md section 2); imported and AI-generated cards still start at `imported` tier and don't count toward progress until re-explained in the user's own words. Each import is recorded; an Imports history page appears on the dashboard after the first one. A note's AI-generated quiz can also be played on demand (`/notes/[id]`, Quiz tab), capped at 2 AI generations per rolling 24 hours per section 5 (`src/lib/quota.ts`), with remaining quota shown on the button.

**Phase 4 (discovery and paths): done.** LLM-interpreted subject search on the public home page, usable signed out (`/study/[query]`). Serper for web results, YouTube Data API for videos and playlists. Real video/playlist ids are extracted in code (`src/lib/youtube.ts`) rather than left for the model to guess, sorted newest-upload-first for every subject so a search always surfaces current information. Every candidate resource is checked for a live response (`src/lib/link-checker.ts`) before a path can be saved; broken links are discarded, not shown. Free resources are sorted ahead of paid in code, not left to the model's word. A query naming a certification or exam (a CompTIA exam, AWS Solutions Architect, and so on) gets a staged, multi-part path instead of one flat list, free-first within every stage. Saving a path or acting on it (`src/app/dashboard/actions.ts`) prompts sign-in for signed-out users.

**Phase 5 (polish): mostly done.** A landing page with a real interactive markdown-to-recall-card demo (not a screenshot of one), an embedded video split-view workspace with timestamp capture for note-taking while a video plays, a contrast pass, SEO metadata (sitemap, robots, Open Graph/Twitter tags), and a copy pass to keep marketing and UI text in the site's own voice (see section 19). A cursor-tracked accent spotlight on hover (`TiltCard`, applied everywhere it's used) and a count-up entrance on the dashboard's stat numbers, both skipped entirely under `prefers-reduced-motion` per section 13. Not yet done: `/study/[query]` isn't statically cached (it still calls the AI/search APIs live per request), and Playwright coverage is limited to one end-to-end spec.
