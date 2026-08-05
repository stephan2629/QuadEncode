---
name: Note Parser Audit
description: Validate that markdown note parsing correctly extracts Vocabulary Flashcards and Multiple Choice Quizzes into database-ready structures.
---

# Note Parser Audit

Validate that markdown note parsing correctly extracts Vocabulary Flashcards
and Multiple Choice Quizzes into database-ready structures.

## Command trigger

`audit-parser` or "Test note parsing syntax"

## Execution workflow

1. Run unit tests for the blank and note parser:
   ```bash
   npx vitest run src/lib/parseBlanks.test.ts
   ```
   (This repo's actual parser test file - the `**Vocab:**`/`**Def:**` blank
   parser lives at `src/lib/parseBlanks.ts`. Multiple-choice quiz parsing
   lives separately at `src/lib/quiz-parser.ts`, which has no test file yet.)
