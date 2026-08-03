# Server routes

No `/app/api/` REST routes exist yet — all mutations go through Next.js Server Actions (`'use server'` functions), called directly from client components or `<form action={...}>`. Every action gets its Supabase client from `@/utils/supabase/server`, which reads the session from cookies; row level security scopes every query to the signed-in user, so actions don't do their own ownership checks beyond what RLS already enforces.

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
| `createSubject` | `(formData: FormData)` | `name` field. Requires an authenticated user (only action in the app with an explicit check beyond RLS). Slugifies the name. |
| `createNote` | `(formData: FormData)` | `subjectId`, `title` fields. |
| `deleteSubject` | `(formData: FormData)` | `id` field. Cascades to the subject's notes and cards via FK. |
| `deleteNote` | `(formData: FormData)` | `id` field. Cascades to the note's cards via FK. |

## `src/app/notes/[id]/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `getNote` | `(id: string)` | Returns the note plus its subject name, or `null`. |
| `updateNoteContent` | `(id: string, body_md: string)` | Called on a 1s debounce from the editor. Saves `body_md`, then parses `??`/`>>` pairs (`parseBlanks`) and syncs cards: new pairs with a non-empty answer create a box-0 card, edits to an existing pair's text update its prompt/answer. Never deletes a card — removing a pair from the note does not remove its card. Deliberately skips `revalidatePath` to avoid interrupting typing. |
| `updateNoteTitle` | `(id: string, title: string)` | Called on blur, not debounced. Revalidates `/notes/[id]` and `/dashboard`. |
| `createClozeCard` | `(noteId: string, line: number, prompt: string, answer: string)` | Triggered by selecting text and pressing Cmd/Ctrl+K in the editor. Creates a box-0 `cloze` card directly — does not modify the note body. |
| `generatePromptsFromFile` | `(noteId: string, formData: FormData)` | Phase 3 import. Accepts a `file` (PDF or image) or pasted `text`. PDFs are text-extracted locally with `pdf-parse`; the content goes to Gemini (`GEMINI_API_KEY`, server-only) with a prompts-only system prompt per section 2 — never answers. Returns up to 12 `??` prompts, each followed by an empty `>>` so they land as open blanks under `## Open questions`. Records a row in `imports`. |

## `src/app/review/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `submitReview` | `(cardId: string, correct: boolean)` | Binary Leitner rating (section 8) — no three-way scale. Advances the box via `src/lib/scheduler.ts`, logs a `reviews` row, and on the 3rd cumulative failure appends "Explain this a different way" as a new open prompt under `## Open questions` in the source note. |
| `keepCard` | `(cardId: string)` | Box 0's first-review quality control pass. Promotes the card straight to box 1. |
| `updateCard` | `(cardId: string, prompt: string, answer: string)` | Edits a box-0 card's text without changing its box. |
| `deleteCard` | `(cardId: string)` | Removes a bad box-0 card. |
