# Notes and quizzes implementation prompt

Adopt the Database & Backend Architect role for database and server-action work, the Markdown Parser & Flashcard Engine role for note parsing, and the UI/UX & Motion Designer role for editor interactions. Follow `AGENTS.md` and `CLAUDE.md`.

## Goal

Make notes the only source of flashcards and quizzes. A user can create study material by typing a note, importing pasted text, or importing a document or PDF. Do not provide a button that asks AI to generate cards or quizzes from an arbitrary existing note.

## Note and import behavior

- Typed note syntax creates cards during autosave.
- Support the documented markdown formats:

  ```markdown
  **Vocab:** Term
  **Def:** Definition

  **Quiz:** Question
  **A:** Correct answer | Wrong answer 1 | Wrong answer 2 | Wrong answer 3
  ```

- Also support these compatible dash formats:

  ```text
  Vocab - Term
  Def - Definition

  Quiz - Question
  A - Correct answer | Wrong answer 1 | Wrong answer 2 | Wrong answer 3
  ```

- A plain `Term: Definition` or `Term - Definition` line may create a vocabulary card.
- Pasting into the note editor must open the Import dialog with the clipboard text prefilled. Do not insert it directly into the note and do not send it to AI in the background.
- The Import dialog handles pasted text and document/PDF imports. It may use AI to extract exactly 10 vocabulary cards and 10 multiple-choice quiz questions from the supplied source.
- Every AI-created question and correct answer must be grounded in the entered, pasted, or imported source. AI may clarify wording and create distractors. It may randomize the display order of options.
- Remove the note-level AI card and quiz generator and its button.

## Quiz limits

- Allow three AI import scans per subject in a rolling 24-hour window.
- Enforce this in Postgres, not only in the browser.
- Use a subject-scoped quota row or usage table with row-level locking so concurrent imports cannot exceed the limit.
- Display a clear message when a subject has used all three scans, including the approximate reset time.
- Typed markdown cards and quizzes do not consume this quota.

## Review scope and deletion

- Subject review must query cards only from notes in the selected subject.
- A note's Practice and Quiz tabs must use only that note's content.
- Deleting a note must remove the note, its cards, and all reviews for those cards. Keep database cascade constraints and make the delete path safe for older deployed schemas.
- Prevent duplicate answer options before rendering a quiz. Use stable React keys that do not rely on answer text alone.

## Dashboard and editor feedback

- Disable note creation while it is pending so repeated clicks or Enter presses cannot create duplicates.
- After successful creation, show `New note created` on the dashboard. Remove that alert when its note is deleted.
- Read browser storage only after mount. Do not create hydration mismatches from `sessionStorage` or `localStorage` during initial render.

## Validation

- Plan before coding and keep each implementation step to two or three files.
- Add or update parser tests for vocabulary pairs, quiz options, dash syntax, imports, and duplicate options.
- Add an end-to-end test for paste to Import, import generation, note deletion cleanup, and subject-scoped review.
- Run lint, unit tests, and Playwright tests. Apply database migrations before testing the deployed flow.
