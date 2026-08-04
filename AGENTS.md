<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Workflow & Working Agreements

- **Plan before coding (Spec -> Todo -> Code):** Never jump straight into code for large features. First define the goal, write constraints, create an implementation plan, and turn it into a TODO list. Only implement once the plan is clear and verified.
- **Break work into small chunks:** Incremental tasks are easier to verify and reduce context bloat. Each chunk needs one clear objective, limited surface area, and an obvious stopping point.
- **Clear context on task switches:** Keep threads to a single mission. When switching to unrelated tasks, clear the context to avoid pulling in irrelevant history and wasting token budgets.
- **Keep context lean:** This document and other instructions are intentionally kept concise to optimize token limits and context usage. Do not repeat context unnecessarily.
- **Build one phase at a time.** Ask before moving on.
- **Every phase ends deployed and working.**
- **Prefer the simplest thing that works.** No abstraction until there are three cases.
- **Enforce core rules:** Always force retrieval before recognition (users never see an answer they didn't write or attempt to retrieve). Adhere strictly to progressive disclosure (features only appear when there's data for them).

# AGENTS.md: Quad Encode Agent Roles & Workflows

This document defines specialized agent roles for AI coding assistants working on Quad Encode. Every task must be assigned to or adopted by one of the following roles. All agents must strictly adhere to the guidelines in `CLAUDE.md`.

---

## 1. Universal Workflow Protocol (Required for ALL Agents)

1. **Spec First:** Before writing code, write a brief plan listing affected files, schema changes, and potential edge cases.
2. **Chunked Tasks:** Break implementation into discrete steps (max 2-3 files per step). Validate after each step.
3. **Core Rules Enforcement:** 
   - Never reveal answers before user retrieval (`CLAUDE.md` §2).
   - Maintain progressive disclosure—no empty state placeholders (`CLAUDE.md` §3).
   - Respect AI rate limits (max 2 quizzes/day, `CLAUDE.md` §5).

---

## 2. Specialized Agent Roles

### 🏛️ Agent 1: Database & Backend Architect
* **Responsibilities:** Supabase migrations, Row Level Security (RLS) policies, Next.js Server Actions, PostgreSQL rate-limiting logic.
* **Key Guidelines:**
  - Put all AI logic in `src/lib/ai.ts` (`GEMINI_API_KEY` primary with retry, `OPENAI_API_KEY` fallback).
  - Enforce server-side rate limits in Postgres (`ai_quiz_usage` / `profiles.daily_quiz_count`).
  - Never prefix secrets with `NEXT_PUBLIC_`.
  - Ensure all tables have user-isolated RLS enabled.

---

### 🎨 Agent 2: UI/UX & Motion Designer
* **Responsibilities:** Next.js App Router components, Tailwind CSS styling, Framer Motion animations, accessible interfaces.
* **Key Guidelines:**
  - **Palette & Type:** Warm near-black (`#14120F`), serif for prompt/question text (28px min), monospace for technical terms, sans-serif for chrome.
  - **Motion Rules:** Answer reveal MUST be **0ms duration** (instant). Card flips use 3D axis rotation. Wrap layout in `MotionConfig reducedMotion="user"`.
  - **Quizzes:** Build clean, single-question Codecademy-style views with instant feedback and a comprehensive diagnostic results summary screen.
  - **Rate Limit UI:** Display remaining daily quota on quiz trigger buttons (`2/2 left today`).

---

### 📝 Agent 3: Markdown Parser & Flashcard Engine
* **Responsibilities:** Markdown parsing utilities, Leitner box scheduler, `**Vocab:**` and `**Def:**` extraction.
* **Key Guidelines:**
  - Parse inline markdown to produce front/back vocabulary cards (`**Vocab:**` / `**Def:**`) and multiple choice quiz blocks (`**Quiz:**` / `**A:** option1 | option2`).
  - Implement Leitner box scheduling (Box 0 = immediate, Box 1 = 1d, Box 2 = 3d, Box 3 = 7d, Box 4 = 21d, Box 5 = retired).
  - Failed cards drop back to Box 1 and spawn a re-explanation prompt in the note.

---

### 🧪 Agent 4: QA, Testing & Humanizer Agent
* **Responsibilities:** Vitest unit tests, Playwright E2E tests, copy humanization, accessibility verification.
* **Key Guidelines:**
  - Write unit tests for Leitner scheduler, daily quiz rate-limiter, and markdown vocabulary parsers.
  - Write E2E Playwright tests verifying the quiz flow: Generation -> Question Progression -> Results Screen -> Converting missed questions to Box 0 cards.
  - Verify WCAG AA compliance (contrast ratios, focus states, keyboard navigation `1-4`, `Space`, `Enter`).
  - Run humanization checks on all copy (no marketing buzzwords, no dashes, no AI fluff).

---

## 3. How to Prompt with Agents

When starting a task, instruct your AI assistant using one of the agent roles:

```text
Adopt the [Agent Role Name] role.
Task: [Describe the task]
Follow the Universal Workflow Protocol and CLAUDE.md rules.
```
