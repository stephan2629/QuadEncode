@AGENTS.md

# CLAUDE.md: Quad Encode

Instructions for AI assistants and developers working in this repository. Read this file before starting any task.

---

## 1. What this project is

Quad Encode is a study platform for anyone learning something structured. A user searches a topic, gets a ranked path of good learning resources with free options ahead of paid, works through it, takes notes in the app, and turns those notes into recall prompts on a spaced repetition schedule.

It must work equally well for any subject. Example subjects to keep in mind while building and while writing copy:

- Learning Spanish
- AWS Solutions Architect
- Music theory
- Organic chemistry
- Project management
- Learning to use AI tools well

Nothing in the interface, the copy, or the data model may assume a certification, an exam date, a syllabus, or a professional context. A hobbyist learning guitar chords and a person studying for a professional exam are both the intended user. Subjects are rows in a table, never schema.

Web first. A mobile app comes later, so avoid anything that would block wrapping this in Capacitor.

**Search works signed out.** The subject search on the public home page (an LLM interprets the free-text query into a subject and a ranked path) is usable without an account. Everything past search (saving a path, creating a subject/note, taking quizzes, reviewing cards) requires signing in. Don't gate the search box itself behind auth.

---

## 2. The rule that governs every feature

**A user never sees an answer they did not write or attempt to retrieve themselves.**

Reading study material feels productive and retains almost nothing. Every decision in this app exists to force retrieval before recognition.

In practice:

- Imports, scrapes, screenshot parsing, and AI generation produce **prompts/questions only**. Never pre-filled answers.
- Extracted source text or image excerpts may be stored as `source_excerpt` and shown behind a collapsed peek control. It must never pre-populate an answer field.
- The answer reveal in review is instant. See section 13.
- Progress is measured by cards reaching box 4, never by cards created.
- **Multiple Choice & AI Quizzes:** Quizzes and multiple choice cards allow structured diagnostic evaluation. To maintain active recall principles, incorrect options (distractors) act as a secondary filter after the user attempts initial retrieval.

If a request conflicts with this rule, stop and say so before writing code.

---

## 3. Progressive disclosure

**Nothing card- or quiz-related exists until the user creates a card or takes a quiz.**

This is an absence, not an empty state. On first run there is no deck, no zero-cards-due counter, no disabled review button, no placeholder illustration explaining what cards or quizzes are. The review/quiz section does not appear in navigation at all. It appears the moment the first card or note quiz is generated.

The same principle applies throughout. The interface grows as the user builds it:

| Feature appears when |
|---|
| Search and Notes: always |
| Review & Quizzes: first card or quiz exists |
| Progress and stats: five or more cards/reviews exist |
| Subject switcher: second subject exists |
| Import history: first import completed |

Do not build "empty state" screens for features the user has not started using. Build the absence instead.

---

## 4. Two card tiers

| | Authored | Imported / AI-Generated |
|---|---|---|
| Answer written by | The user | The source / AI |
| Purpose | Mastery | Diagnostic |
| Counts toward progress | Yes | No |
| Visual treatment | Solid border | Dashed border, dimmed |

Imported or AI-generated cards graduate to authored after two correct answers followed by the user re-explaining the concept in their own words. Store `tier` on every card.

---

## 5. Token Protection & AI Rate Limiting (2 Quizzes / Day)

To keep API token usage under control and prevent quota exhaustion:

1. **Strict 2 Quizzes Per Day Rule:** Each authenticated user is restricted to generating **2 AI quizzes per 24-hour period**.
2. **Quota Tracking:** Track daily generations in Postgres (`ai_quiz_usage` table or columns on `profiles` tracking `quiz_count_today` and `last_quiz_reset_at`).
3. **UI Rate Limit Feedback:** 
   - Show a remaining daily count indicator on the "Generate Quiz" button (e.g., "Generate Quiz (2/2 left today)").
   - When the limit is reached, gracefully disable the button and show an informative message: *"You've reached your daily limit of 2 AI quizzes. Your quota resets at midnight UTC."*
4. **Fallback & Static Quizzes:** Users can still manually create flashcards or retake previously generated quizzes without consuming AI quota.

---

## 6. Flashcard System: Vocabulary-Only (Front & Back)

Flashcards generated from notes follow a strict **Front and Back Vocabulary** format:

- **Structure:**
  - **Front:** Vocabulary Word / Term / Concept
  - **Back:** Concise Definition / Explanation
- **Extraction from Notepad:** When a user writes notes in the markdown editor, vocabulary terms marked with the `**Vocab:**` syntax are automatically parsed into double-sided flashcards.
- **Card Format Example:**
  ```markdown
  **Vocab:** Spaced Repetition
  **Def:** A learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.
  ```

---

## 7. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript strict mode |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Database, Auth, Storage | Supabase (Postgres) |
| Deploy | Netlify with the official Next.js plugin |
| Testing | Vitest for unit, Playwright for end to end |
| External APIs | Gemini (primary) with an OpenAI fallback for subject search, resource descriptions, import parsing, and quiz generation; YouTube Data API v3; a web search API such as Brave or Serper |

Supabase over Firebase because the data is relational and row level security handles per user isolation without a custom auth layer.

**Never expose API keys to the browser.** All third party calls go through server-only code: Next.js Server Actions (`'use server'` files) today, or routes under `/app/api/` if a plain REST endpoint is ever needed. Nothing secret gets a `NEXT_PUBLIC_` prefix.

**AI calls go through one shared function, not a provider SDK per call site.** `src/lib/ai.ts` exports `generateText({ prompt, image?, json? })`, which tries Gemini first (`GEMINI_API_KEY`, with `Gemini_API_Key2` as a second key and a couple of retries on transient 503s) and falls back to OpenAI (`OPENAI_API_KEY`) if Gemini fails for any reason: missing key, quota, or an outage. This is what keeps one flaky provider from taking down imports, quiz generation, or path search, and from failing the build if a key is briefly unset. Add a new provider by adding one entry to the `PROVIDERS` list in that file, not by touching the three call sites.

---

## 8. Data model

```sql
profiles        id, user_id, display_name, created_at
subjects        id, user_id, name, slug, created_at
paths           id, subject_id, generated_at
path_steps      id, path_id, order, resource_id, status
resources       id, subject_id, title, url, provider, is_free,
                cost, format, description, rank
notes           id, subject_id, section, title, body_md, updated_at
cards           id, note_id, line, tier, type, prompt, answer,
                confusable_with[], source_excerpt, video_id, t,
                box, due, fails
reviews         id, card_id, rated, reviewed_at
imports         id, subject_id, kind, raw_ref, status, created_at
```

- `cards.note_id` plus `cards.line` is the back pointer. A failed review jumps the user to that line in their note.
- `cards.video_id` plus `cards.t` jumps to the exact second in a source video.
- Enable row level security on every table. Users read and write only their own rows.

---

## 9. Note syntax

Notes are standard markdown. Recall prompts are marked inline using natural markdown prefixes. Section 6 retires the old standalone `**Q:**/**A:**` flashcard: vocabulary front/back and quiz are the only two flashcard formats.

**Vocabulary (front/back flip):**
```markdown
**Vocab:** Spaced Repetition
**Def:** A learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.
```

**Multiple Choice (Quiz):**
Add pipe `|` characters on the answer line to create multiple choice options. The **first** item is always the correct answer. The UI will randomize the order when testing the user. You can also optionally include an `**Explain:**` line below the answer line to show the user why the answer was correct (only shown if they miss it).
```markdown
**Quiz:** What is the specific IP address range reserved for APIPA?
**A:** 169.254.0.0/16 | 192.168.0.0/16 | 10.0.0.0/8 | 172.16.0.0/12
**Explain:** APIPA (Automatic Private IP Addressing) automatically assigns an IP in this block when a DHCP server is unreachable.
```

- An empty answer (e.g. `**A:** `) means the blank is open and shows as a todo in the note.
- Filling an empty answer promotes it to a card in box 0 automatically. No separate button.
- Box 0 cards jump the queue and show Keep, Edit, Delete on first review, so the first retrieval doubles as quality control.
- Cloze cards are made by selecting text and pressing Cmd+K. This is the fastest path to a card and should feel effortless.

Imports generate these Markdown blocks and append them at the bottom of the note.

---

## 10. Scheduling

Leitner boxes, not SM-2.

| Box | Next review |
|---|---|
| 0 | Immediately, unverified |
| 1 | 1 day |
| 2 | 3 days |
| 3 | 7 days |
| 4 | 21 days |
| 5 | Retired |

Correct moves up one box. Wrong drops to box 1. Three failures spawn a new Vocab/Def blank in the source note, term set to the failing prompt, so the user re-explains the concept in their own words.

Sessions cap at 5 cards even when more are due and end with a real completion screen showing correct/wrong counts and the missed prompts with their back-pointer links. Practice modes covering one note, one subject, or weak cards do not write to the schedule.

Multiple choice formats are allowed in the graded review schedule. Distractors are defined via the pipe syntax (`**A:** Correct | Wrong1 | Wrong2`) and order is randomized upon render.

---

## 11. Build phases

Follow the software development life cycle. Each phase runs plan, design, build, test, document, deploy, then stop and check in. Do not build ahead.

**Every phase ends with a live build.** Push to Netlify, confirm the deployed version works, and record the preview URL in the phase notes. A phase is not done until it is running somewhere other than localhost. Branch deploys give a preview URL per pull request. Use them.

**Phase 0, foundations**
Repo, TypeScript strict, Tailwind, Supabase project, environment variables, Netlify connection, CI running tests on push. Deploy a placeholder page to prove the pipeline works end to end before writing features.

**Phase 1, auth and notes**
Sign up (with name), sign in, sign out, protected routes. Password reset. Google OAuth as an alternative to email/password sign-in. Self-service account deletion. Markdown note editor with autosave. Ships as a usable note app on its own, with no card machinery visible anywhere.

**Phase 2, cards and review**
Blank parsing, cloze creation, box 0 promotion, review screen, Leitner scheduler, back pointer jump, session cap, completion screen. Review navigation appears only once a card exists. After this phase the app is genuinely usable for studying.

**Phase 3, imports**
Paste box first. Then PDF text extraction. Then screenshot import using a vision model to read questions from an image. All imports create imported tier cards or open prompts, never answers.

**Phase 4, discovery and paths**
LLM-interpreted subject search on the public home page, usable signed out. YouTube Data API for playlists and chapters, sorted by upload date rather than relevance so the newest matching video surfaces first for every subject, keeping results current. Web search API for everything else. A hand curated source registry per subject as the reliable backbone. Every candidate resource is checked for a live 200/301/302 response before it can be saved; broken links never reach a path. Free ranked above paid, enforced in code after generation rather than left to the model. Each resource gets a written description of what it covers and who it suits. Signed-out users can search and browse results; saving a path or acting on it prompts sign-in.

**Phase 5, polish**
Motion, SEO, accessibility audit, performance, error states.

**Later, do not build now**
Paid tiers, deeper AI assist, native mobile app, multi subject switcher.

---

## 12. Design direction

Aim for something that does not look like a template.

- Background: warm near black, around `#14120F`. Paper at night, not a console.
- One accent color for due and active states. One muted secondary for retired.
- Type: serif for prompt text, monospace for identifiers and technical terms, sans for interface chrome. The serif slows the eye down, which is what you want during recall.
- Prompt text at 28px minimum, generous line height, line length capped near 60 characters.
- Rating buttons differentiated by position and label, never by color alone.
- Accessibility is part of the build, not a later pass. WCAG AA contrast, visible focus states, real semantic HTML, keyboard first review.

Copy on marketing surfaces must be verifiable. Don't present invented usage numbers (adoption counts, completion rates, retention percentages) as real statistics. This product has no user base yet. Describe what the product actually does (the box schedule, the note syntax, free-ranked-first resources) rather than claiming outcomes nobody has measured.

Two alternative directions (sticker-book/bright-paper and arcade/dark-neon) were explored and rejected in favor of keeping this one. See `/docs/decisions/0001-landing-page-direction.md`.

---

## 13. Motion

Animation makes the interface feel alive between moments of work. It must never interfere with recall.

**Non-negotiable:** the answer reveal is instant. Zero duration. No fade, no scale, no blur in. Any transition lets the eye skim the answer before the brain attempts retrieval, which defeats the entire product.

Everything else:

| Element | Motion |
|---|---|
| Prompt enters | 120ms, fade with 8px rise |
| Rating buttons on reveal | 100ms, 30ms stagger |
| Card exits after rating | 150ms, slide toward the rating direction |
| Search results | 40ms stagger down the list |
| Page transitions | 200ms maximum |
| Progress bars | Spring, quiet, no overshoot |
| Session complete | The one place a real, satisfying animation is welcome |
| Review nav first appearing | Animate it. This is the app growing. |

**Forbidden:**

- Looping, idle, or ambient animation. Nothing moves unless the user caused it.
- Celebration effects on a correct answer. Confetti, particles, bursts. Getting one right is normal, not an achievement.
- Indefinitely shimmering skeleton loaders.

With `prefers-reduced-motion` enabled, every duration above becomes zero. No exceptions and no subtle fallbacks.

Implement all of the above with Framer Motion (see section 7), wrapped once in `MotionConfig reducedMotion="user"` at the root layout so every component gets the reduced-motion behavior for free instead of re-implementing it per component. Plain CSS `transition`/`:hover` is fine for simple, non-list hover and focus states; reach for Framer Motion once there's a stagger, a spring, or a mount/unmount transition (`AnimatePresence`) involved.

---

## 14. Design references

Study reference sites for patterns. Never copy their code, assets, or look.

**Allowed**

- Reading how a site structures a lesson, a review session, or a progress indicator
- Noting interaction flows: what happens on a wrong answer, how position is tracked, where the primary action sits
- Screenshotting a screen and writing down what it does well and why
- Reading public documentation and marketing pages

**Not allowed**

- Copying CSS, component code, or DOM structure
- Reusing brand colors, logos, illustrations, icon sets, or licensed fonts
- Scraping course content, lesson text, or question banks from a learning platform. That content is the product those companies sell and their terms forbid it.
- Building anything whose layout is recognizably a specific competitor's

**Reference set**

| Reference | What to study |
|---|---|
| Codecademy | Lesson structure, checkpoint pacing, sidebar position tracking |
| Anki | Review mechanics, rating scale, scheduling transparency |
| Duolingo | Session length and completion feel, minus streaks and guilt loops |
| Linear | Keyboard first interaction, command palette, speed as a design value |
| Obsidian | Markdown editing feel, linking between notes |
| Notion | Onboarding without a tour |

**Workflow**

1. Name the problem, for example "how should a wrong answer feel."
2. Look at how three or more references handle it.
3. Write a paragraph in `/docs/design/references.md` covering what each does, what works, what does not.
4. Design from that analysis. Do not pick a winner and copy it.

Combining six sources produces something original. Copying one produces a clone.

**ui-ux-pro-max skill.** This repo has the `ui-ux-pro-max` Claude Code skill installed (`.claude/skills/`), a searchable checklist covering accessibility, touch targets, animation timing, and layout patterns. Use it for `ux`-domain checks (contrast, focus states, heading hierarchy, reduced motion) and as a sanity check before shipping a page. Its `--design-system` output (color palettes, font pairings) is a generic template default and does not apply here: the palette, type system, and motion spec in sections 7, 12, and 13 of this document are already decided and take priority over anything the skill suggests.

**frontend-design skill.** Use this skill when building a new page or component that needs real visual design work, not just markup and Tailwind classes: a distinctive hero, a deliberate type and layout plan, one signature element the surface is remembered by, restraint everywhere else, and copy treated as design material rather than decoration. The skill normally starts by pinning down a subject and brainstorming a palette and type system from scratch; here that step is already done. Sections 7, 12, and 13 are the brief: skip the generic-palette brainstorm and apply the decided warm-near-black background, serif/mono/sans type roles, and motion spec with the same discipline the skill asks for elsewhere, one real signature choice per surface, self-critique before shipping, never the cream-background or acid-green defaults it falls back to when nothing else is specified.

---

## 15. Interaction principles

- One screen, one job. Anything visible during review that is not the current prompt is an escape hatch from the hard part.
- Sessions end. A visible finished state is a feature.
- No streaks, points, or badges. Streaks punish a bad week and make people quit.
- Interactive means the interaction is the recall itself: drag to match terms, click the diagram, branch through a scenario. Not a reward wrapped around a flashcard.

---

## 16. SEO

The app sits behind auth and cannot rank. Public subject pages can.

- Static, indexable pages at `/study/[slug]`, for example `/study/music-theory`.
- Next.js Metadata API. Unique title and description per page.
- Generated at build time or with ISR, never client side.
- Add `sitemap.xml`, `robots.txt`, Open Graph tags, and JSON-LD `Course` schema on subject pages.
- Marketing shell public, app private.

---

## 17. Testing

Write tests in the same phase as the feature, not after.

- Unit tests for the Leitner scheduler, the blank parser, and the import prompt generator. These three carry the most logic and the most risk.
- Component tests for the review screen and the note editor.
- One Playwright end to end test per phase covering the main path through that phase.
- CI passes before merge.

---

## 18. Documentation

Every phase updates:

- `README.md` with setup and current feature state
- `/docs/decisions/` with a short record per significant technical choice: context, decision, tradeoff accepted
- `/docs/api.md` for every server route
- `/docs/design/references.md` per section 14
- Inline comments only where the reason is not obvious from the code

---

## 19. Writing style for anything user facing

No text in this product may read as AI written. This covers every string a user can see: landing pages, headings, button labels, empty states, error messages, tooltips, onboarding, resource descriptions, and any AI generated summary shipped to the user.

Run the humanizer skill over all copy before it ships. It is a required step in every phase, not a final polish pass.

Avoid:

- Marketing inflation: vibrant, seamless, unlock, empower, revolutionize, in today's fast paced world
- Rule of three cadence, where every list and sentence arrives in threes
- Em dashes and en dashes
- Significance puffing: stands as a testament, plays a crucial role, marks a shift
- Fake candid openers: "Honestly? It depends."
- Negative parallelism: "It's not just X, it's Y"

Write plainly. Say what the thing does. Vary sentence length. Specific beats general.

Error messages say what happened and what to do next. No apologies and no personality for its own sake.

For AI generated resource descriptions in phase 4, put these constraints in the system prompt itself rather than cleaning up the output afterward.

---

## 20. Working agreements & AI Workflow

- **Plan before coding (Spec -> Todo -> Code):** Never jump straight into code for large features. First define the goal, write constraints, create an implementation plan, and turn it into a TODO list. Only implement once the plan is clear and verified.
- **Break work into small chunks:** Incremental tasks are easier to verify and reduce context bloat. Each chunk needs one clear objective, limited surface area, and an obvious stopping point.
- **Clear context on task switches:** Keep threads to a single mission. When switching to unrelated tasks, clear the context to avoid pulling in irrelevant history and wasting token budgets.
- **Keep context lean:** This document and other instructions are intentionally kept concise to optimize token limits and context usage. Do not repeat context unnecessarily.
- **Build one phase at a time.** Ask before moving on.
- **Every phase ends deployed and working on Netlify.**
- **Prefer the simplest thing that works.** No abstraction until there are three cases.
- **No rich text editor.** Markdown textarea with preview. WYSIWYG is a multi-week sinkhole.
- **Do not import from exam dump sites** or leaked question banks.
- **Keep imported source text private** to the user who imported it.
- **Enforce core rules:** If a request conflicts with section 2 (retrieval first) or section 3 (progressive disclosure), stop and say so before writing code.
