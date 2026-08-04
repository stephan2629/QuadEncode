# Server routes

No `/app/api/` REST routes exist yet — all mutations go through Next.js Server Actions (`'use server'` functions), called directly from client components or `<form action={...}>`. Every action gets its Supabase client from `@/utils/supabase/server`, which reads the session from cookies; row level security scopes every query to the signed-in user, so actions don't do their own ownership checks beyond what RLS already enforces.

## `src/lib/ai.ts`

Every AI text-generation call in the app goes through `generateText({ prompt, image?, json?, provider? })` instead of calling a provider SDK directly. It tries Gemini first (`gemini-flash-latest`, using `GEMINI_API_KEY`, then `Gemini_API_Key2` as a second key if the first is rate-limited or overloaded, with two retries on transient 503s), then falls back to OpenAI (`OPENAI_API_KEY`, `gpt-4o-mini` by default) if Gemini fails for any reason — missing key, quota, or outage. `provider` can pin a single provider instead of the auto fallback (used by the import modal's model picker). This keeps a single Gemini problem from taking down import parsing, quiz generation, or path search, and from failing the build if a key is briefly unset. Every AI call site (`generatePromptsFromFile`, `generateAIQuizAction`, `generatePath`) routes through it.

## `src/lib/link-checker.ts`

`checkLinkStatus(url: string): Promise<boolean>` — HEAD request with a 5s timeout, falling back to GET if the server rejects HEAD; accepts only `200`/`301`/`302`. Used by `generatePath` to discard dead resources before a path is saved. Not a server action itself (no `'use server'`), just a helper called from one.

## `src/lib/youtube.ts`

`searchYouTube(query, apiKey): Promise<YouTubeCandidate[]>` — wraps the YouTube Data API v3 search endpoint, extracting the real `videoId`/`playlistId` into a `watch?v=`/`playlist?list=` URL in code rather than leaving URL construction to the model. Results are requested with `order=date` (not `relevance`) for every subject, so the newest upload that still matches the query sorts first — the prompt in `generatePath` then prefers the freshest candidate. Also just a helper, no `'use server'`.

## `src/app/login/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `login` | `(formData: FormData) => { error: string } \| void` | `email`/`password` fields. On success, redirects to `/dashboard`. |
| `signup` | `(formData: FormData) => { error: string } \| void` | Same fields. Creates the account, redirects to `/dashboard`. |
| `logout` | `() => void` | Signs out, redirects to `/`. |
| `deleteAccount` | `() => void` | Calls the `delete_own_account` Postgres function (security definer, deletes the caller's `auth.users` row; everything else cascades via FKs), signs out, redirects to `/`. Behind a confirm dialog in the dashboard footer. |

Password reset doesn't need a server action: the login page calls `supabase.auth.resetPasswordForEmail` client-side with a redirect to `/auth/callback?next=/auth/reset-password`, and the reset page calls `supabase.auth.updateUser({ password })` on the recovery session.

## `src/app/auth/callback/route.ts`

`GET /auth/callback?code=…&next=…` — exchanges an OAuth or recovery code for a session, then redirects to `next` (internal paths only, defaults to `/dashboard`). Used by both Google sign-in and the password reset email link.

## `src/app/dashboard/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `createSubject` | `(formData: FormData)` | `name` field. Requires an authenticated user (explicit check beyond RLS). Slugifies the name. |
| `createNote` | `(formData: FormData)` | `subjectId`, `title` fields. |
| `deleteSubject` | `(formData: FormData)` | `id` field. Cascades to the subject's notes and cards via FK. |
| `deleteNote` | `(formData: FormData)` | `id` field. Cascades to the note's cards via FK. |
| `saveGeneratedPath` | `(pathData: GeneratedPath)` | Phase 4. Finds the user's existing `subjects` row by slug or creates one — `subjects` is unique on `(user_id, slug)`, so a second path for a subject you already have must reuse that row rather than insert a duplicate and throw. Creates a `paths` row plus a `resources`/`path_steps` row per resource. |
| `updatePathStepStatus` | `(stepId: string, status: 'unstarted' \| 'completed')` | Toggled from the dashboard's path tracker checklist. |
| `deletePath` | `(pathId: string)` | Removes a saved path; RLS scopes it to the owner. |
| `setActiveSubject` | `(formData: FormData)` | Sets the `active_subject_id` cookie used to default `/review` and the dashboard to the last-viewed subject. |

## `src/app/notes/[id]/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `getNote` | `(id: string)` | Returns the note, its subject name, its cards, and — if `pdf_path` is set — a freshly minted 1-hour signed URL (`pdfUrl`) for the stored source PDF. Signed URLs aren't persisted since they expire; a new one is minted on every call. |
| `updateNoteContent` | `(id: string, body_md: string)` | Called on a debounce from the editor. Saves `body_md`, then parses `**Vocab:**/**Def:**` and `**Quiz:**/**A:**` blocks (`parseBlanks`) and syncs cards: a non-empty answer creates or updates a card. Vocab cards are tier `authored` (the user must type the definition before the card can exist); quiz cards are tier `imported` (the options are always written in full up front, by an AI import or by hand) per section 4. Never deletes a card — removing a block from the note does not remove its card. Skips `revalidatePath` to avoid interrupting typing. |
| `updateNoteTitle` | `(id: string, title: string)` | Called on blur, not debounced. Revalidates `/notes/[id]` and `/dashboard`. |
| `createClozeCard` | `(noteId: string, line: number, prompt: string, answer: string)` | Triggered by selecting text and pressing Cmd/Ctrl+K in the editor. Creates a box-0 `cloze` card directly — does not modify the note body. |
| `generatePromptsFromFile` | `(noteId: string, formData: FormData)` | Phase 3 import. Accepts a `file` (PDF or image) or pasted `text`, plus an optional `provider` override. PDFs are text-extracted locally with `pdf-parse` and the original file is uploaded to the private `note-pdfs` Storage bucket for later viewing. Content goes through `generateText` with a prompts-only system prompt per section 2 — 6 Vocab blanks (empty `**Def:**`) plus 6 Quiz blocks with full options, landing under `## Open questions`. Records a row in `imports`. |

## `src/app/actions/quiz-actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `getQuizQuota` | `()` | Reads `profiles.quiz_count_today`/`last_quiz_reset_at` and returns the rolling-24h quota state (`src/lib/quota.ts`, limit 2 per section 5). Fails open to a fresh quota rather than erroring the UI if the profile lookup fails. |
| `generateAIQuizAction` | `(noteId: string, content: string)` | Generates 5-10 `**Quiz:**/**A:**` blocks via `generateText` and appends them to the note under `## Generated AI Quiz`, then increments the quota counter. Returns `{ quotaExhausted: true }` without calling the AI at all if the daily limit is already used. |
| `saveMissedQuestionsAction` | `(noteId, currentContent, missedQuestions[])` | Appends missed quiz questions as new `**Vocab:**/**Def:**` blanks (prompt = question, answer pre-filled with the correct option) under `## Missed Questions Review`, turning a diagnostic miss into a box-0 mastery card. |

Local, zero-AI-call quiz/practice play (`src/lib/quiz-parser.ts`, `src/lib/practice.ts`) reads straight from a note's existing cards client-side and never hits a server action — it doesn't touch the AI quota or the Leitner schedule.

## `src/app/study/[query]/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `generatePath` | `(query: string)` | Phase 4 discovery. Requires `SERPER_API_KEY` and `YOUTUBE_API_KEY`; fetches web results (Serper) and YouTube candidates (`src/lib/youtube.ts`, real ids only, sorted newest-first for every subject), then asks `generateText` (JSON mode) to curate 5-6 resources from those candidates only, preferring the freshest relevant video — never a URL the model invents. Every resulting URL is checked with `checkLinkStatus`; failures are dropped. Survivors are sorted free-first in code (not left to the model) and capped at 5. Best-effort upserts the subject into `indexed_subjects` for SEO. Returns `GeneratedPath` or `{ error }`. |

## `src/app/review/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `submitReview` | `(cardId: string, correct: boolean)` | Binary Leitner rating (section 8) — no three-way scale. Advances the box via `src/lib/scheduler.ts`, logs a `reviews` row, and on the 3rd cumulative failure appends a new open Vocab/Def blank under `## Open questions` in the source note so the user re-explains the concept themselves. On a correct answer for an `imported`-tier card, also checks whether the last 2 `reviews` rows for that card are both correct (derived from history, no extra column) and returns `readyToGraduate: true` if so — the review UI intercepts the next advance and prompts the user to re-explain the card instead of moving on. |
| `graduateCard` | `(cardId: string, reExplanation: string)` | Section 4 tier graduation. Overwrites the card's `answer` with the user's own re-explanation and sets `tier: 'authored'`. For a quiz card this also drops the pipe-separated options, so it stops rendering as multiple choice and becomes a normal recall prompt from then on. |
| `keepCard` | `(cardId: string)` | Box 0's first-review quality control pass. Promotes the card straight to box 1. |
| `updateCard` | `(cardId: string, prompt: string, answer: string)` | Edits a box-0 card's text without changing its box. |
| `deleteCard` | `(cardId: string)` | Removes a bad box-0 card. |
