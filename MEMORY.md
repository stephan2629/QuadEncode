# MEMORY.md

A running log of decisions and context that don't belong in CLAUDE.md's spec but matter for picking up work later: why something is built the way it is, what's still open, what to check before assuming the docs match the live app. Newest entries first. CLAUDE.md is still the source of truth for how the product should behave; this file is the history of how it got there.

---

## 2026-08-03

**Standard `**Q:**/**A:**` flashcards are retired.** Vocabulary (front/back flip) and Quiz (multiple choice) are now the only two flashcard formats — a deliberate call, not an oversight, made when CLAUDE.md section 6 turned out to contradict section 9's older syntax table. `parseBlanks.ts` no longer recognizes `**Q:**` at all. The "three failures spawn a new prompt" mechanic (section 10) was migrated from emitting `**Q:**/**A:**` to emitting `**Vocab:**/**Def:**` with the failing card's original prompt as the term, so it still actually produces a parseable card.

**AI provider setup:** Gemini is primary, OpenAI is a real configured fallback (not hypothetical — both keys are present in `.env.local`). Everything routes through `src/lib/ai.ts`'s `generateText()`. Model references use the `gemini-flash-latest` alias, not a pinned version — a pinned `gemini-3.5-flash` was empirically more prone to 503 "high demand" overload than the alias, which Google keeps pointed at whatever build currently has the most capacity. There is no Anthropic/Claude API anywhere in this codebase, despite CLAUDE.md briefly claiming otherwise before this session corrected it.

**AI quiz generation is rate-limited to 2/day per user** (`profiles.quiz_count_today` / `last_quiz_reset_at`, pure logic in `src/lib/quota.ts`, rolling 24-hour window rather than a fixed UTC-midnight reset). Retaking an already-generated quiz replays saved cards and never calls AI, so it never touches quota.

**The AI Quiz tab plays quizzes inline now** — step through questions one at a time, instant right/wrong with an explanation peek on a miss, then a results screen with score, a full per-question diagnostic, and a one-click "turn missed questions into vocab cards" button. It does not write to `cards.box` or the review schedule (CLAUDE.md section 10's practice-mode rule). Two earlier components, `CardsTab.tsx` and `QuizTab.tsx`, were built for a tabbed note-editor design that got reverted by a concurrent edit partway through the session; they became fully orphaned and were deleted rather than kept around unused.

**Real bug found and fixed in `ReviewSession.tsx`:** the multiple-choice picker only appeared for cards already past box 0 (`!isBoxZero && mcData`). Since every card starts life in box 0, freshly generated or freshly authored quiz cards never showed the picker at all on first review — they just revealed the full answer key immediately, which also quietly violated the "attempt before reveal" carve-out CLAUDE.md section 2 grants multiple choice specifically. Fixed by keying the picker on `mcData` alone, independent of box.

**Vocab cards get an instant 3D flip in review**, not the plain text reveal. "Instant" is load-bearing: `VocabFlip.module.css` sets `transition: none` on the rotateY transform, because CLAUDE.md section 13 makes the answer reveal non-negotiably zero-duration. It looks like a flip but is technically a discrete state swap.

**A real "Profile not found" bug turned out to be a missing profile row, not a schema problem.** The quota check was the first code in this repo to ever query `profiles`. Turned out `handle_new_user()`'s backfill (in `schema.sql`) had never actually been run against the live database standalone, so at least one real user account had no `profiles` row at all. Fixed by running the idempotent backfill insert directly rather than the full `schema.sql` (which isn't safe to re-run — its `create table` statements have no `if not exists` guard).

**Still open / worth checking before trusting docs on this:**
- CLAUDE.md and this codebase have both been edited concurrently by more than one process throughout this session (not just this assistant). When something in CLAUDE.md looks internally inconsistent, check `git log`/`git diff` before assuming either the doc or the code is stale — both have moved.
- A `PracticeTab.tsx` and a `practice` tab appeared in `NoteEditor.tsx` via a concurrent edit late in the session; not yet reviewed or verified against CLAUDE.md by this assistant.
- A `TiltCard` component was added to the landing page (`src/app/page.tsx`) by a concurrent edit earlier in the session; also not yet reviewed.
- The "cards due" count badge on the dashboard (`SubjectNav.tsx`) was deliberately removed at the user's request — don't re-add it as a "missing feature."
