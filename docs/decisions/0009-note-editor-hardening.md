# 0009: note editor hardening before launch

## Context

A pre-launch pass over the note editor and its server actions, targeting
four problems found by reading the code rather than by guessing at symptoms.

**The save path did two very different jobs on one trigger.** Every
`updateNoteContent` call ran `syncCardsFromNote`, which re-read every card
in the note and then issued one `insert` or `update` per parsed blank,
sequentially. Saving note text is one cheap `UPDATE`; reconciling cards is
not. Because autosave fires on a 1s debounce while typing, and most typing
is prose that changes no card at all, the cheap frequent operation was
paying the expensive rare one's cost on every keystroke burst. After an AI
generation pass (exactly 10 vocab + 10 quiz per CLAUDE.md section 5) that
meant 20 sequential Supabase round trips.

**Nothing stopped two concurrent saves from double-inserting.**
`handleManualSave` cleared the debounce timer, but an autosave already in
flight kept going. Both invocations read `existing` before either wrote, and
the `seenAnswers` dedup guard is per-invocation, so it could not see across
them. `cards` had no unique constraint of any kind.

**A WebGL canvas ran on every route.** `ThreeBackground` mounted from
`Providers` in the root layout, pulling `three` + `@react-three/fiber` +
`@react-three/drei` into the bundle and running an unbounded
`requestAnimationFrame` loop (plus drei's own `Float` and
`MeshDistortMaterial` animations) for as long as any page stayed open,
including the note editor. Respecting `prefers-reduced-motion`, which it
did, is not the same as satisfying CLAUDE.md section 13's flat prohibition
on "looping, idle, or ambient animation."

**Failures were invisible.** `updateNoteContent` returned `{ error }` on
failure and every caller in `NoteEditor` ignored it, setting `saveStatus` to
`'saved'` regardless. A failed save looked exactly like a successful one.

Separately, a product rule: the note editor's Practice and Quiz tabs should
not appear until a note holds enough material for a real session (10+ vocab
pairs or 10+ quiz pairs), as an absence rather than a disabled tab.

## Decision

**Split the two operations rather than making the expensive one faster.**
`haveBlanksChanged(prev, next)` in `src/lib/parseBlanks.ts` compares a
fingerprint of every non-empty blank (line, kind, prompt, answer,
explanation) between two note bodies. `updateNoteContent` takes an optional
third `prevBodyMd` argument and skips `syncCardsFromNote` entirely when the
fingerprints match. `NoteEditor` tracks the last successfully saved content
in `lastSyncedContentRef` and passes it. Prose-only autosaves now cost one
`UPDATE` and zero card queries. Omitting the argument means "sync anyway",
which keeps the other caller (`generateAIQuizAction`, which appends
genuinely new cards and has no previous state to compare) correct with no
change.

That ref fixed a second latent bug: the previous "has anything changed"
checks compared against `initialData.body_md`, the server-rendered prop,
which never advanced past the first save. After one save every subsequent
keystroke looked changed relative to a stale snapshot.

**Batch the writes that remain.** `syncCardsFromNote` builds `toInsert` and
`toUpdate` arrays using the same `existingByLine` / `seenAnswers` logic as
before (dedup behavior deliberately unchanged), then issues one `insert` and
one `upsert` concurrently via `Promise.all`. The two arrays are disjoint by
construction — `toInsert` is exactly the lines with no existing card,
`toUpdate` exactly the lines that have one — so concurrency is safe. The
update goes through `upsert(..., { onConflict: 'id' })` sending only
prompt/answer/explanation, so `box`, `due`, `tier` and the rest survive
untouched.

**A partial unique index, not application locking.**

```sql
create unique index cards_vocab_basic_note_line_key on cards (note_id, line)
  where type in ('basic', 'vocab');
```

A constraint cannot be raced; application-level locking can. It is partial
rather than whole-table because cloze cards legitimately share a line — two
different selections on one line is a normal cloze workflow, and a cloze
card can coexist with a vocab card on the same line. The predicate keeps
them out of the check entirely, so `createClozeCard` needed no changes.

`insertCardsIgnoringConflicts` handles the conflict path: Postgres rejects a
multi-row insert as a single statement, so on `23505` it re-queries which
`(note_id, line)` pairs now exist, filters them out, and retries once with
the remainder. A legitimate save still succeeds; a lost race is a no-op
rather than an error, because the note text itself already saved.

**Honest note on the race.** After the decoupling above, a deliberate
attempt to reproduce it — type a new pair, wait out the debounce, fire
Cmd+S while the autosave was in flight — produced no duplicate. The window
is now narrow enough that synthetic timing did not hit it. The index is
therefore a guarantee that the duplicate *cannot* happen, not evidence that
it was happening; it is cheap, and reasoning about a timing window is not a
substitute for making it impossible.

**Removed `ThreeBackground` outright rather than scoping it to marketing
routes.** `src/app/` is a flat tree with a single root layout and no route
groups, so scoping would have meant adding layout infrastructure in order to
keep an effect the spec prohibits. The replacement is a static, unanimated
`AmbientGlow` div using two layered `radial-gradient()`s at the same
`blur-[100px] opacity-70` — visually close, zero JavaScript, and nothing to
gate behind `prefers-reduced-motion` because nothing moves. Also dropped
`@tiptap/pm` (imported nowhere; section 20 forbids a rich text editor) and
`@types/three` along with the Three packages: 67 packages removed.

**Every save path now reads its own return value.** Autosave, manual save,
title blur and cloze creation each check for `{ error }`, set a new
`'error'` save status, and raise a toast naming what failed. The status pill
turns red and reads "Save failed", and the failing path does *not* advance
`lastSyncedContentRef`, so the next autosave retries the same content rather
than treating it as already persisted.

**Practice/Quiz tabs gate on live editor content.**
`hasEnoughForPracticeAndQuiz(bodyMd)` counts vocab-kind and quiz-kind blanks
separately and returns true when either reaches 10 — 6 of each does not
qualify, since neither kind alone can fill a session. It reads the live
`content` state rather than saved cards, so the tabs appear as the tenth
pair is typed instead of after a save round trip. They enter through
`AnimatePresence` at 120ms with an 8px rise (section 13's "Prompt enters"
row, the closest documented value; the root `MotionConfig reducedMotion="user"`
zeroes it automatically).

**Cloze cards deliberately do not count toward the threshold.** A note with
30 cloze cards and no vocab pairs still shows only the Notes tab. This is
not an oversight: Practice reverses a vocab card's front and back, and Quiz
plays multiple choice built from vocab definitions and quiz options. A cloze
card is neither — it has no distractor set and no separable term/definition
pair — so those two tabs would have nothing to show. Cloze cards are
reviewed through the main `/review` Leitner flow, which is unchanged and
still appears on the first card.

**Moved the AI generation control to the Notes tab.** It previously lived
inside the Quiz tab's idle state, which the new gate would have hidden until
10 quizzes existed — hiding the only button that creates them. Separating
creation from play resolves it: `GenerateCardsButton.tsx` sits on the Notes
tab where material is written, and Practice/Quiz stay purely for using
material that already exists. Quota display and disabled state are
unchanged. It is placed on its own row below the tip line, apart from the
formatting toolbar, so it does not read as one of the template-insertion
buttons section 23 forbids.

**CI gets Supabase secrets, and the security tests fail loudly without
them.** The RLS test and the note editor e2e spec both need a signed-in
user; email confirmation is on for this project, so a plain `signUp` never
yields a session unattended, and both create throwaway users through the
admin API and delete them afterwards. `.github/workflows/ci.yml` now passes
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` from repository secrets. When they are absent
**in CI** both suites throw rather than skip: a security test that quietly
skips itself is indistinguishable from one that proves nothing. Locally they
skip, so a fresh clone still gets a green `npm test`.

**No application-level ownership check was added.** `getNote`,
`updateNoteContent`, `updateNoteTitle` and `createClozeCard` rely entirely
on the `own notes` / `own cards` RLS policies, and `src/lib/notes-rls.test.ts`
now proves that boundary holds: user B cannot read, update, or insert cards
onto user A's note. The fourth test in that file asserts user A *can* do all
three, which is what stops the other three from passing vacuously against a
simply-broken client. An app-level check would query the same tables through
the same policy — a second copy of one rule, and another place to forget it,
rather than a real second layer.

## Lighthouse

Production build (`npm run build && npm run start`), after these changes:

| Page | Preset | Perf | A11y | Best practices | SEO | TBT | LCP |
|---|---|---|---|---|---|---|---|
| `/` | desktop | 97 | 100 | 100 | 100 | 0 ms | 1.3 s |
| `/` | mobile | 77 | 100 | 100 | 100 | 0 ms | 6.7 s |
| `/study/[slug]` | desktop | 97 | 100 | 100 | 100 | 0 ms | 1.2 s |
| `/study/[slug]` | mobile | 78 | 100 | 100 | 100 | 0 ms | 6.3 s |

Desktop meets every target (Performance ≥ 90, Accessibility / Best
practices / SEO ≥ 95). **Mobile Performance does not** (77 and 78 against a
≥ 90 target) and this is stated plainly rather than reported around: it is
driven entirely by Lighthouse's simulated-mobile LCP of 6.3–6.7 s, while
Total Blocking Time is 0 ms and Cumulative Layout Shift is 0 on both pages.

That LCP is pre-existing and not caused by this work. Rebuilding with
`AmbientGlow` removed entirely produced an identical 77 / 6.7 s, and an
unthrottled DevTools trace of the same page measures real LCP at 1038 ms
with a 540 ms render delay. Fixing simulated-mobile LCP on the landing page
is a separate piece of work on that page's render path, not part of a note
editor pass.

Accessibility on `/study/[slug]` was 96 before a fix made during this pass:
the icon-only back links there and in the note editor header had no
accessible name (Lighthouse `link-name`; a screen reader read them as just
"link"). Both got an `aria-label`.

The app routes sit behind auth and cannot be audited by Lighthouse
meaningfully. Their Total Blocking Time was checked manually instead: the
note editor traces at 0 ms TBT and 852 ms LCP after the Three.js removal.

## Trade-off accepted

- **The partial unique index must be applied by hand.** This project has no
  migration runner; `supabase/schema.sql` is the record, applied manually
  through the Supabase SQL editor (the same as `path_cache` in 0006). Until
  it is run against the live database the DB-level race guarantee is
  inactive and only the application-level dedup applies. The live database
  was checked for pre-existing duplicates before writing the index — none
  (30 basic/vocab cards, zero conflicting `(note_id, line)` pairs) — so the
  DDL applies cleanly with no data cleanup first.
- **The 500k character cap on `body_md` rejects rather than truncates.**
  A note that large is already pathological, but truncating typed content
  to fit a limit is silent data loss, so the save fails with a message
  naming the size and the limit instead.
- **`haveBlanksChanged` re-parses both bodies on every save.** Parsing is
  linear over the note text and runs on the server, which is far cheaper
  than the card round trips it avoids. Not memoized: a cache keyed on note
  content would add invalidation logic to save a few milliseconds.
- **The threshold reads live editor content, so it can flicker.** Deleting
  content back below 10 pairs hides the tabs again, and an `useEffect`
  forces the active tab back to Notes so the editor never renders a panel
  for a tab that no longer exists. Gating on saved cards instead would have
  delayed the reveal behind a save round trip, which reads as lag.
