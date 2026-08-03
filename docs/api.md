# Server routes

No `/app/api/` REST routes exist yet — all mutations go through Next.js Server Actions (`'use server'` functions), called directly from client components or `<form action={...}>`. Every action gets its Supabase client from `@/utils/supabase/server`, which reads the session from cookies; row level security scopes every query to the signed-in user, so actions don't do their own ownership checks beyond what RLS already enforces.

## `src/app/login/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `login` | `(formData: FormData) => { error: string } \| void` | `email`/`password` fields. On success, redirects to `/dashboard`. |
| `signup` | `(formData: FormData) => { error: string } \| void` | Same fields. Creates the account, redirects to `/dashboard`. |
| `logout` | `() => void` | Signs out, redirects to `/`. |

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

## `src/app/review/actions.ts`

| Action | Signature | Behavior |
|---|---|---|
| `submitReview` | `(cardId: string, correct: boolean)` | Binary Leitner rating (section 8) — no three-way scale. Advances the box via `src/lib/scheduler.ts`, logs a `reviews` row, and on the 3rd cumulative failure appends "Explain this a different way" as a new open prompt under `## Open questions` in the source note. |
| `keepCard` | `(cardId: string)` | Box 0's first-review quality control pass. Promotes the card straight to box 1. |
| `updateCard` | `(cardId: string, prompt: string, answer: string)` | Edits a box-0 card's text without changing its box. |
| `deleteCard` | `(cardId: string)` | Removes a bad box-0 card. |
