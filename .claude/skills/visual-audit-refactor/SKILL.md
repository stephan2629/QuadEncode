---
name: Visual Audit & Code Refactor
description: Capture a screenshot of QuadEncode (local or deployed), evaluate it against project design rules, and refactor the front-end components producing any defect found.
---

# Visual Audit & Code Refactor Skill

Capture a screenshot of QuadEncode (local or deployed), perform a visual and
UX evaluation against project design rules, and refactor front-end
components to resolve design flaws.

## Command trigger

Use this skill when the user asks to:
- "Take a screenshot and check the design"
- "Audit the visual layout of [URL]"
- "Fix UI/UX issues based on the rendered page"
- `visual-audit`

## Execution workflow

### Step 1: capture a screenshot

```bash
node scripts/capture-screenshot.js http://localhost:3000 current-state.png
```

If checking a specific page or live preview, replace `http://localhost:3000`
with the target URL, e.g. `https://quadencode.netlify.app/study/aws`. Pass
`--viewport=390x844` as a third argument to check a mobile breakpoint.

The script (`scripts/capture-screenshot.js`) uses `@playwright/test`, already
a project dependency (CLAUDE.md §22), rather than a new headless-browser lib.
Output lands in `.claude/screenshots/` (gitignored).

### Step 2: visual inspection & checklist evaluation

Read and inspect `.claude/screenshots/<output-filename>`. Evaluate the
rendered UI against these reference pillars:

**QuadEncode design spec (CLAUDE.md §12–13)**
- Background palette: warm near-black (`#14120F`). Paper-at-night feel, no
  plain console black or bright white backgrounds.
- Typography roles: serif for prompts/titles, monospace for
  identifiers/technical terms, sans for UI chrome.
- Copy rules: plain, humanized, sentence-case headlines. Zero gamification
  language ("streak", "level", "unlock", "XP"), no fake statistics.
- Motion & states: answer reveal is instant, zero duration. No infinite
  shimmering skeleton loaders.

**frontend-design skill standards**
- Visual hierarchy: is there a distinct focal point?
- Breathing room: are padding, margins, and line height generous and
  balanced?
- Restraint: does the layout avoid unneeded clutter or excess decoration?

**ui-ux-pro-max skill standards**
- Accessibility & contrast: is text readable at WCAG AA contrast against
  `#14120F`?
- Alignment & touch targets: are interactive elements aligned with adequate
  padding (minimum 44x44px for touch)?
- Responsive layout: check for overflow, broken flex wrapping, or misaligned
  grid items.

**ui-styling skill standards**
- Component states: do interactive elements have visible hover, focus, and
  disabled states, not just a default look?
- This project hand-rolls Tailwind components, no shadcn/ui, so skip that
  skill's shadcn-specific guidance; apply its general accessible-styling and
  dark-mode-consistency checks instead.

**design-system skill standards**
- Token consistency: does a component reuse the spacing, radius, and color
  values already established elsewhere in `src/` (e.g. `rounded-3xl`,
  `bg-[#14120f]/60`, the `accent` color), or does it invent one-off values
  that drift from the rest of the app?
- Type scale: do headings and body text fall on the sizes already in use
  (see section 12's serif/mono/sans roles), rather than an arbitrary size
  introduced just for this component?

**twentyfirst-components skill standards** (only relevant if the flagged
component was adapted from 21st.dev/shadcn rather than built in-house)
- Color palette mapping: no leftover pure black/`slate-950` from the source
  component - normalized to `bg-[#14120f]`?
- Typography mapping: serif/mono/sans roles applied per section 12, not the
  source component's original font choices?
- Motion: no long/complex layout transitions or shimmering skeletons
  carried over; flashcard/quiz reveals still instant per section 13?

### Step 3: code refactoring

1. Identify the exact React/Next.js component(s) in `src/` producing the
   visual defect.
2. Refactor the Tailwind CSS, markup, or layout styles to fix the issue,
   reusing existing values/patterns from `src/` per the design-system check
   above rather than introducing new ones.
3. Re-run the screenshot script (Step 1) against the same URL to verify the
   fix before reporting it done.
