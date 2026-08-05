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
with the target URL, e.g. `https://quadencode.netlify.app/study/aws`.

Pass device viewports or presets to audit across screen sizes (from small 4.7" phones to 13" tablets):
- **iPhone SE / Small Phone (375x667):** `node scripts/capture-screenshot.js http://localhost:3000 iphone-se.png --device=iphone-se`
- **Standard Mobile (390x844):** `node scripts/capture-screenshot.js http://localhost:3000 mobile.png --device=iphone-pro`
- **Mid-size Tablet (768x1024):** `node scripts/capture-screenshot.js http://localhost:3000 tablet-mini.png --device=ipad-mini`
- **13-inch Large Tablet (1024x1366):** `node scripts/capture-screenshot.js http://localhost:3000 tablet-13.png --device=ipad-13`

The script (`scripts/capture-screenshot.js`) uses `@playwright/test`, already
a project dependency (CLAUDE.md §22), rather than a new headless-browser lib.
Output lands in `.claude/screenshots/` (gitignored).

### Step 1b: auditing a screenshot the user took themselves

Sometimes the image to audit isn't one this skill captured - it's a phone or
browser screenshot the user already has (their own device, a state this
script can't reach like a native share sheet or an OAuth consent screen).
Pasting it inline in a long chat can get rejected once a session's image
budget is spent, and there's no local file for Read to fall back to.

Have the user save it into `.claude/screenshots/inbox/` (same gitignored
directory as captured shots, kept in its own subfolder so inbox files never
collide with `current-state.png`-style script output) and give you the
filename, instead of pasting it into the chat. Read it from that path like
any other screenshot in this skill - Step 2's checklist applies identically,
it doesn't matter whether Playwright or the user's phone produced the file.

### Step 2: visual inspection & checklist evaluation

**If Read on a screenshot comes back "rejected by API" / media removed:**
that's the conversation's image budget, exhausted from earlier screenshots
in a long session, not a bad file. Don't keep retrying the same path. Either
resume the audit in a fresh conversation (full budget), or fall back to a
DOM-based check with Playwright (`page.locator(...).count()` /
`textContent()` against the specific rule you're verifying) instead of a
screenshot - that still confirms the fix without needing to view an image.

Read and inspect `.claude/screenshots/<output-filename>`. Evaluate the
rendered UI against these reference pillars:

**Caveat: scroll-linked (not scroll-triggered-once) animations can render
mid-transition in the screenshot.** The capture script scrolls through the
page in steps to fire `whileInView` animations, then resets to the top
before shooting - that reliably settles a one-time `whileInView` trigger,
but a component wired to *live* scroll position via `useScroll`/
`useTransform` (e.g. `ContainerScrollAnimation.tsx`) can be left stuck at
whatever value the last synthetic scroll step computed, showing as
washed-out/faded text that has nothing wrong with it. Before treating a
faded or oddly-positioned element as a defect, check whether it sits inside
a `useTransform(scrollYProgress, ...)` binding - if so, verify live instead
of trusting the screenshot: `mcp__chrome-devtools__evaluate_script` to read
`getComputedStyle(el).opacity` at `scrollTop=0` (its correct pre-scroll
state, often legitimately `0`) and again after
`el.scrollIntoView({block:'center'})` (should reach `1`). Only flag it if
the *scrolled-to* state is wrong - the resting state being faded is by
design for a scroll-reveal effect.

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

**mobile-responsive-audit skill standards**
- Capture both a phone (`--viewport=390x844`) and a tablet-width
  (`--viewport=768x1024`, iPad portrait) shot, not desktop only - this is
  the skill's actual breakpoint table (mobile base, `sm:` 640px, `md:` 768px
  tablet, `lg:` 1024px, `xl:` 1280px).
- Touch targets: interactive elements at least 44x44px, `gap-2` or more
  between adjacent tappable elements.
- Primary CTAs full-width on mobile (`w-full sm:w-auto`), not a cramped
  fixed-width button.
- No horizontal scrollbars or content overflowing the viewport at any of
  the breakpoints above.
- When applying a fix, use this project's actual `accent` color token (see
  design-system check above), not the skill's generic `amber-500` example
  snippets - those are illustrative, not this app's palette.

**Auth flow: password reset**
`/login` covers sign-in and sign-up by default, but the reset flow has its
own two states worth capturing separately:
- `/login` → "Forgot password?" → reset-request form (email field, "Send
  reset link" button, `notice` banner on success).
- `/login?error=reset_link_invalid` - the state a user lands on when a
  recovery link's code exchange fails (expired, already used, or opened in
  a different browser than the one that requested it). Confirm the reset
  form renders directly with the red `role="alert"` banner, not a dead-end
  bare login screen (see `src/app/auth/callback/route.ts` and
  `humanizeCallbackError` in `src/lib/auth-errors.ts` - this was a real bug
  fixed in this repo, worth a regression check on future audits).

### Step 3: code refactoring

1. Identify the exact React/Next.js component(s) in `src/` producing the
   visual defect.
2. Refactor the Tailwind CSS, markup, or layout styles to fix the issue,
   reusing existing values/patterns from `src/` per the design-system check
   above rather than introducing new ones.
3. Apply the `ponytail` skill's discipline to the fix itself: the smallest
   diff that resolves the flagged defect, not a rewrite of the surrounding
   component. Reuse an existing utility class, pattern, or nearby component
   before writing new markup (ponytail's ladder, step 2) - a design defect
   is a styling bug, not license to restructure. Skip any abstraction
   (a new shared component, a config option, a variant prop) unless the
   same defect already recurs in three or more places; note that as a
   one-line `skipped: X, add when Y` rather than building it preemptively.
4. Re-run the screenshot script (Step 1) against the same URL to verify the
   fix before reporting it done.
