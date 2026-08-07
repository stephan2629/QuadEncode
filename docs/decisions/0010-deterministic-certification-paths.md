# 0010: certification paths are a fixed shape, enforced in code

## Context

`/study/[query]` had one path generator for everything. A subject search
("Spanish vocabulary", "music theory") wants what it always produced: a flat
list of good resources with free ones on top. A certification search wants
something different. There is one correct answer for CompTIA CySA+, and it
does not change between two people searching for it an hour apart.

What shipped instead was a flat, differently-ordered list every generation.
Three exams (A+, Network+, Security+) were hardcoded in `src/lib/certPaths.ts`
and looked right. Everything else (the rest of the CompTIA line, AWS, CCNA,
Azure, PMP) fell through to Serper + YouTube + Gemini and came back with the
official exam page third, a blog post above the course, a Reddit thread as
study material, and a different order each time. The prompt asked for stages.
The model sometimes gave stages, sometimes did not, and invented its own stage
names when it did.

Two bugs turned up while reading the code for this, neither of them in the
original report:

- The hardcoded paths never fired for the query people actually type. The home
  page slugified "CompTIA Security+" to `comptia-security`, which drops the
  `+` that `getHardcodedCertPath`'s `/security\s*\+/` was matching on. Only
  someone typing "security plus" (normalized to `security+` by
  `normalizeCertPlus`) ever hit the pinned path. Everyone else got the
  generated one. Detection now reads the slug form, and the slug keeps the `+`
  as the word "plus" rather than dropping it, so the URL still says which exam
  it is and `A+ certification` no longer arrives as `a-certification`.
- `checkLinkStatus` rejected Udemy. Udemy answers 403 to a server-side fetch
  with no browser fingerprint, inconsistently. Since the paid course option
  and most exam prep live on Udemy, the link check would have emptied half of
  every certification path this change produces.

## Decision

**One shape for every certification, applied after generation, not asked for
in the prompt.** `src/lib/certShape.ts` holds `detectCertification()` (a
registry of about twenty certifications, each with its vendor domains and the
free/paid instructors to prefer) and `enforceCertShape()`, which buckets the
generated resources into three steps and drops what does not fit:

1. `overview`: the exam overview on the vendor's own site, one page.
2. `course`: the training course, in two versions of the same thing. The free
   version must be a YouTube URL, the paid one must be Udemy. Both live on one
   card with a Free/Paid selector, free selected first, because they are one
   step with a choice in it rather than two things to do. A certification with
   more than one exam (A+ has two) gets a card per exam, tagged with `exam`, so
   Core 1 and Core 2 each offer the same choice.
3. `exam-prep`: exam prep material, one or two resources, from the vendor's
   domain or Udemy only, free first so a vendor's own free practice questions
   beat a paid practice exam to the first slot. These are two cards, not a
   selector: a free question bank and a paid practice exam are not two versions
   of one thing, and working through both is normal. Discounts, bundles, and
   free tiers are said in the `cost` field rather than getting a field of their
   own.

The original brief called for the two course versions to be listed as two
cards, explicitly "not a toggle". The owner reversed that after seeing it
rendered: two cards read as two steps to work through, which is the opposite
of what the course step means. The selector is the version that shipped.

`PathResource.stage?: string` became `step?: 'overview' | 'course' |
'exam-prep'` plus an optional `exam` label. A free-text field let the model
name its own stages; a union does not.

Detection falls back to the vendor when a query names one without naming an
exam. A bare "CompTIA" search used to match nothing and fall through to a flat
AI path carrying a retry button, which is the case that prompted this
paragraph. It now resolves to CompTIA generally and gets the same three steps.
A vendor outside the registry still gets the flat path: without a domain to
allowlist against there is no way to enforce the shape, and guessing one is
how a path ends up recommending an exam-dump site.

The precedent is CLAUDE.md section 4's free-first rule, which is a sort in
`generatePath()` rather than a line in the prompt. A model can ignore an
instruction, a filter cannot. The prompt still describes the shape, because a
response that already fits means fewer resources thrown away, but nothing
depends on it: a resource with no `step` gets one inferred from its domain and
title, and anything that still does not fit a step is dropped rather than
reordered.

**The newest exam version wins, without a table of exam codes.** Search
engines rank a retired course highly for years, so relevance order alone hands
back courses for exams nobody can sit: Messer's SY0-601 outranks his SY0-701 on
plenty of queries. `newestExamVersionFirst()` pulls codes out of candidate
titles and URLs and, when two candidates name the same code prefix, prefers the
higher number (SY0-701 over SY0-601, 220-1201 over 220-1101, CS0-003 over
CS0-002). Candidates sharing no prefix keep the order they arrived in, so this
only fires when it is genuinely comparing two versions of one exam. Keeping a
list of current codes was the obvious alternative and was rejected: it needs
editing every time a vendor refreshes an exam, which is the maintenance this
whole file exists to avoid. Certification paths also cache for seven days
rather than thirty, because exam codes turn over on the vendor's schedule and
a stale certification path is worse than a stale subject path.

**Trusted sources are an allowlist, not a ranking.** Exam prep may come from
the vendor's own domain or Udemy. Everything else is dropped. A separate named
`NEVER_RECOMMEND` list (Reddit, Quora, forums, exam-dump sites) applies to
every path, certification or not, and runs before `checkLinkStatus` so no
link-check request is spent on a resource that was never eligible. CLAUDE.md
section 20 already bans importing from exam dump sites; recommending one is
the same problem one step earlier.

**Certifications lose the "Try a different path" button.** The retry exists
because AI curation genuinely varies and a second opinion is worth something.
A deterministic path has no second opinion to offer: retrying spends a full
Serper + YouTube + Gemini pass to rebuild the same three steps. The button is
scoped rather than removed, so skills and subjects keep it, still capped at
three tries.

**The choice is saved, not just displayed.** The Free/Paid selection lives in
`PathResult` rather than inside the card, so "Save path" sends the version the
learner picked and drops the other one. Picking the paid course and landing on
a dashboard tracking the free one would make the selector decorative.

**The path cache is versioned in its row key.** `path_cache` holds a row per
searched subject for 30 days. Every one of those rows was written in the old
shape, so without this the fix would appear not to work for any subject anyone
had already searched, which is the most likely way to ship this wrong.
`pathCacheKey()` prefixes the slug with `v2:`. A row written in the old format
is not found under the new key, which reads as a miss and regenerates.

There is a second cache, and missing it made the whole change look like it had
not shipped. `PathResult` stores a retried path in `localStorage` and pastes it
over the server's version on every later visit, unversioned and with no expiry.
Anyone who had ever clicked "Try a different path" on a certification kept
seeing their old stored path no matter what the server returned, in that
browser only. The key now carries the same version, and a certification reads
no override at all (it has no retry, so it can have no stored result) and
clears any left from before.

**The path reads down one rail, not side to side.** The timeline alternated
cards left and right on desktop using `md:odd:flex-row-reverse`, which takes
its parity from `nth-child`. The step headings sit between the cards, so they
shifted that parity and the cards clumped onto one side with tall empty bands
opposite them. Rather than repair the parity, the zigzag is gone: one rail on
the left, full-width cards to the right of it, identical at every breakpoint.
A path is a sequence read top to bottom, and a zigzag makes the eye cross the
page for every step while leaving half of each row empty whenever two cards
differ in height.

## Trade-off accepted

**The instructor registry is a file, hand maintained.** About twenty entries,
each supplying vendor domains and two names. It does not know exam codes and
does not try to: codes rot, and pinning them would turn every exam refresh
into a code change. Instead the YouTube search for a certification is ordered
by relevance rather than upload date and seeded with the free creator's name,
because a newest-first sort surfaces a study-group livestream rather than the
course. This scales to roughly one vendor's worth of exams; past that, or once
per-exam codes need maintaining, it wants a `certifications` table with the
same three fields read in `generatePath()`. A missing or wrong entry degrades
to the flat AI path rather than breaking the search, which is what makes the
file acceptable in the first place.

**The three pinned CompTIA paths still go stale by hand.** Everything above
keeps generated paths current on its own. `src/lib/certPaths.ts` is exempt by
design: its URLs skip the link check and the version sort, so when CompTIA
retires SY0-701 that file keeps pointing at the old course until someone edits
it. That is the price of pinning Messer and Dion exactly, and it is the first
thing to check when an exam code changes.

**A certification path can come back with a step missing.** If nothing
survives the filters for a step, that step is empty and the page says which
one rather than quietly shipping two steps that look like three. The
alternative, relaxing a rule to fill the gap, is how the original bug
happened.

**Old cache rows are stranded, not deleted.** `v1` rows sit in `path_cache`
until someone runs `delete from path_cache where slug not like 'v2:%'`. One
row per searched subject is not worth a migration.

**403 now counts as a live link.** A bot-protected host that answers 403 to a
server-side fetch loads fine for a person, and a genuinely dead URL on those
same hosts still returns 404, which is still rejected. The cost is that a page
which really is forbidden to everyone would now be allowed into a path.

**Certification search costs two extra Serper calls.** One `site:udemy.com`,
one against the vendor's domain. The general search surfaces neither reliably,
and the model is barred from inventing a URL, so without them the course and
exam-prep steps have nothing to be built from. They run in parallel with the
existing call, and only on a cache miss.
