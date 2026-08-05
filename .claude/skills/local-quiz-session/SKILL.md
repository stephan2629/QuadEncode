---
name: local-quiz-session
description: Implement local persistence for flashcards and quizzes so active session state, current question, and scores survive browser tab refreshes.
when_to_use: "Save quiz session locally", "Persist flashcards on refresh", "Save notes practice session", "local-quiz-session"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Local Quiz & Practice Session Persistence Skill

This skill enables Claude Code to implement, audit, and refactor the Flashcard and Multiple-Choice Quiz sessions in QuadEncode to store active session state locally (`localStorage` or `sessionStorage`), ensuring progress is preserved even if the user refreshes or reopens the browser tab.

---

## Core Requirements & Specifications

1. **Local Storage Session Persistence:**
   - Active quiz/flashcard progress state (current question index, selected answers, flipped state, score tracking, option shuffle order) MUST be persisted in browser `localStorage` or `sessionStorage`.
   - On page load or tab refresh, the practice component automatically hydrates and restores the user's exact current session state instead of starting over.
   - Provide an explicit **"Reset Session"** or **"Start Over"** button in the UI so users can manually purge local session state when desired.

2. **Database Persistence Boundary:**
   - **Mid-Session:** Save state continuously to browser `localStorage`.
   - **Session Completion:** Upon reaching the final question/results screen, sync final results to Supabase (Leitner box progress and activity logs), then clear the active local session key.

3. **Strict Format Enforcements (`AGENTS.md`):**
   - **Practice Mode:** Strictly Flashcards (double-sided recall).
   - **Quiz Mode:** Strictly Multiple-Choice format (`**Quiz:**` question with `|` separated options, 1st option correct).

---

## Execution Workflow

### Step 1: Audit Current Session State Strategy
Search `src/` for quiz and flashcard state handlers. This repo doesn't use
hooks named `useQuiz`/`useFlashcard` - the real session-state components are:

```bash
grep -n "useState" src/app/review/ReviewSession.tsx
grep -n "useState" src/app/practice/PracticeSession.tsx
grep -n "useState" src/app/notes/[id]/QuizTab.tsx
```

`ReviewSession.tsx` also already has an existing `useSessionStorage` hook
pattern in use elsewhere in this repo (`src/hooks/useSessionStorage.ts`, used
by `NoteEditor.tsx` for tab/preview state) - reuse that hook rather than
writing a new localStorage wrapper from scratch.

Note the scope this skill is adding on top of existing behavior: per
CLAUDE.md section 10, review sessions already write to the Leitner schedule
per-answer (not batched at the end), and practice/quiz-tab modes explicitly
do **not** write to the schedule at all. This skill's "sync final results to
Supabase... then clear" step (requirement 2) applies to restoring where the
user left off in the UI, not to re-deriving box/due-date writes that already
happen elsewhere - don't duplicate that logic.
