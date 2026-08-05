---
name: twentyfirst-components
description: Adapt, tailor, and integrate UI components inspired by 21st.dev or shadcn into QuadEncode while strictly adhering to AGENTS.md design specs.
when_to_use: "Add component from 21st.dev", "Use 21st dev style", "Integrate 21st.dev component", "twentyfirst-components"
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# 21st.dev Component Integration Skill

This skill allows Claude Code to adapt UI components from 21st.dev or modern Tailwind UI libraries and cleanly integrate them into QuadEncode without breaking brand palette, typography, or performance rules.

---

## Strict Integration Guardrails (`AGENTS.md`)

When copying or adapting a 21st.dev component, **immediately apply these transformations**:

1. **Color Palette Mapping:**
   - Replace any pure black (`bg-black`, `#000000`) or standard dark slate (`bg-slate-950`) with QuadEncode's warm dark background: `bg-[#14120F]`.
   - Ensure text contrast meets WCAG AA standards against `#14120F`.

2. **Typography Mapping:**
   - Titles, prompts, and main headers → Use **Serif** (`font-serif`).
   - Technical IDs, timestamps, syntax tokens → Use **Monospace** (`font-mono`).
   - Buttons, navigation, and UI chrome → Use **Sans-serif** (`font-sans`).

3. **Motion & Interaction Rules:**
   - Remove long, complex Framer Motion layout transitions or infinite shimmering skeleton loaders.
   - Flashcards and quiz reveals must operate with instant (0ms) state transitions.

4. **Practice & Quiz Scope Constraints:**
   - If adapting a flashcard component, keep it strictly double-sided flip.
   - If adapting a quiz component, keep it strictly multiple-choice format.

---

## Execution Workflow

### Step 1: Clean Component Code
- Strip out unused props, external icons, or non-essential dependencies.
- Ensure the component is written in idiomatic React/Next.js (App Router compatible, `'use client'` tagged if interactive).

### Step 2: Adapt Tailwind Styling
- Refactor class names to use established QuadEncode design tokens (e.g., `rounded-3xl`, `bg-[#14120f]/60`, `border-slate-800`).
- Convert any arbitrary pixel values (e.g., `p-[13px]`) to QuadEncode's spacing scale.

### Step 3: Type Checking & Verification
- Save the component in `src/components/ui/` (this repo's real location - `src/components/workspace/` doesn't exist here).
- Run type checks to confirm zero TypeScript errors:
  ```bash
  npm run typecheck
  ```
