@AGENTS.md

# CLAUDE.md — Quad Encode

Instructions for Claude Code working in this repository. Read this file before starting any task.

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

**Search works signed out.** The subject search on the public home page (an LLM interprets the free-text query into a subject and, later, a ranked path — see Phase 4) is usable without an account. Everything past search — saving a path, creating a subject or note, reviewing cards — requires signing in. Don't gate the search box itself behind auth.

---

## 2. The rule that governs every feature

**A user never sees an answer they did not write themselves.**

Reading study material feels productive and retains almost nothing. Every decision in this app exists to force retrieval before recognition.

In practice:

- Imports, scrapes, and AI generation produce **prompts only**. Never answers.
- Extracted source text may be stored as `source_excerpt` and shown behind a collapsed peek control. It must never pre-populate an answer field.
- The answer reveal is instant. See section 11.
- Progress is measured by cards reaching box 4, never by cards created.

If a request conflicts with this rule, stop and say so before writing code.

---

## 3. Progressive disclosure

**Nothing card-related exists until the user creates a card.**

This is an absence, not an empty state. On first run there is no deck, no zero-cards-due counter, no disabled review button, no placeholder illustration explaining what cards are. The review section does not appear in navigation at all. It appears the moment the first card is made.

The same principle applies throughout. The interface grows as the user builds it:

| Feature appears when |
|---|
| Search and Notes: always |
| Review: first card exists |
| Progress and stats: five or more cards exist |
| Subject switcher: second subject exists |
| Import history: first import completed |

Do not build "empty state" screens for features the user has not started using. Build the absence instead.

---

## 4. Two card tiers

| | Authored | Imported |
|---|---|---|
| Answer written by | The user | The source |
| Purpose | Mastery | Diagnostic |
| Counts toward progress | Yes | No |
| Visual treatment | Solid border | Dashed border, dimmed |

Imported cards graduate to authored after two correct answers followed by the user re-explaining the concept in their own words. Store `tier` on every card.

---

## 5. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript strict mode |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Database, Auth, Storage | Supabase (Postgres) |
| Deploy | Netlify with the official Next.js plugin |
| Testing | Vitest for unit, Playwright for end to end |
| External APIs | Claude API for subject search and resource descriptions, YouTube Data API v3, a web search API such as Brave or Serper |

Supabase over Firebase because the data is relational and row level security handles per user isolation without a custom auth layer.

**Never expose API keys to the browser.** All third party calls go through server routes under `/app/api/`. Nothing secret gets a `NEXT_PUBLIC_` prefix.

---

## 6. Data model

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

## 7. Note syntax

Notes are markdown. Recall prompts are marked inline:

```
?? What does a diminished chord sound like and when is it used?
>> Tense and unstable. Often a passing chord between two stable chords.
```

- `??` is the prompt line, `>>` is the answer line.
- An empty `>>` means the blank is open and shows as a todo in the note.
- Filling a `>>` promotes it to a card in box 0 automatically. No separate button.
- Box 0 cards jump the queue and show Keep, Edit, Delete on first review, so the first retrieval doubles as quality control.

Cloze cards are made by selecting text and pressing Cmd+K. This is the fastest path to a card and should feel effortless.

Imports append prompts under a `## Open questions` heading at the bottom of the note, capped at 12 per import, with the remainder in a collapsed tray.

---

## 8. Scheduling

Leitner boxes, not SM-2.

| Box | Next review |
|---|---|
| 0 | Immediately, unverified |
| 1 | 1 day |
| 2 | 3 days |
| 3 | 7 days |
| 4 | 21 days |
| 5 | Retired |

Correct moves up one box. Wrong drops to box 1. Three failures spawn a new prompt in the source note reading "Explain this a different way."

Sessions cap at 20 cards even when more are due and end with a real completion screen showing correct/wrong counts and the missed prompts with their back-pointer links. Practice modes covering one note, one subject, or weak cards do not write to the schedule.

Multiple choice exists only as a practice mode (`/practice`), never as the graded review. It is recognition rather than recall, so per section 2 it cannot feed the Leitner schedule; distractors come from the user's own other cards, and the results screen states that practice doesn't change the schedule.

---

## 9. Build phases

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
LLM-interpreted subject search on the public home page, usable signed out. YouTube Data API for playlists and chapters. Web search API for everything else. A hand curated source registry per subject as the reliable backbone. Free ranked above paid. Each resource gets a written description of what it covers and who it suits. Signed-out users can search and browse results; saving a path or acting on it prompts sign-in.

**Phase 5, polish**
Motion, SEO, accessibility audit, performance, error states.

**Later, do not build now**
Paid tiers, deeper AI assist, native mobile app, multi subject switcher.

---

## 10. Design direction

Aim for something that does not look like a template.

- Background: warm near black, around `#14120F`. Paper at night, not a console.
- One accent color for due and active states. One muted secondary for retired.
- Type: serif for prompt text, monospace for identifiers and technical terms, sans for interface chrome. The serif slows the eye down, which is what you want during recall.
- Prompt text at 28px minimum, generous line height, line length capped near 60 characters.
- Rating buttons differentiated by position and label, never by color alone.
- Accessibility is part of the build, not a later pass. WCAG AA contrast, visible focus states, real semantic HTML, keyboard first review.

Copy on marketing surfaces must be verifiable. Don't present invented usage numbers (adoption counts, completion rates, retention percentages) as real statistics — this product has no user base yet. Describe what the product actually does (the box schedule, the `??`/`>>` syntax, free-ranked-first resources) rather than claiming outcomes nobody has measured.

Two alternative directions (sticker-book/bright-paper and arcade/dark-neon) were explored and rejected in favor of keeping this one. See `/docs/decisions/0001-landing-page-direction.md`.

---

## 11. Motion

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

---

## 12. Design references

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

---

## 13. Interaction principles

- One screen, one job. Anything visible during review that is not the current prompt is an escape hatch from the hard part.
- Sessions end. A visible finished state is a feature.
- No streaks, points, or badges. Streaks punish a bad week and make people quit.
- Interactive means the interaction is the recall itself: drag to match terms, click the diagram, branch through a scenario. Not a reward wrapped around a flashcard.

---

## 14. SEO

The app sits behind auth and cannot rank. Public subject pages can.

- Static, indexable pages at `/study/[slug]`, for example `/study/music-theory`.
- Next.js Metadata API. Unique title and description per page.
- Generated at build time or with ISR, never client side.
- Add `sitemap.xml`, `robots.txt`, Open Graph tags, and JSON-LD `Course` schema on subject pages.
- Marketing shell public, app private.

---

## 15. Testing

Write tests in the same phase as the feature, not after.

- Unit tests for the Leitner scheduler, the blank parser, and the import prompt generator. These three carry the most logic and the most risk.
- Component tests for the review screen and the note editor.
- One Playwright end to end test per phase covering the main path through that phase.
- CI passes before merge.

---

## 16. Documentation

Every phase updates:

- `README.md` with setup and current feature state
- `/docs/decisions/` with a short record per significant technical choice: context, decision, tradeoff accepted
- `/docs/api.md` for every server route
- `/docs/design/references.md` per section 12
- Inline comments only where the reason is not obvious from the code

---

## 17. Writing style for anything user facing

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

## 18. Working agreements

- Build one phase at a time. Ask before moving on.
- Every phase ends deployed and working on Netlify.
- Prefer the simplest thing that works. No abstraction until there are three cases.
- No rich text editor. Markdown textarea with preview. WYSIWYG is a multi week sinkhole.
- Do not import from exam dump sites or leaked question banks. Using real exam questions violates most certification candidate agreements and can get a credential revoked.
- Keep imported source text private to the user who imported it.
- If a request conflicts with section 2 or section 3, say so before writing code.
