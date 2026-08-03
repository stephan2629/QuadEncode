# Landing page visual direction

## Context

Two full visual directions for the marketing landing page were explored in Claude Design and imported for review:

- **1A, Arcade / Dark Neon** — near-black `#0B0B0F` background, neon green `#C8FF2E` and violet `#8B5CF6` accents, Space Grotesk / JetBrains Mono / DM Sans.
- **1B, Sticker Book / Bright Paper** — warm cream `#FFF8EC` background, burnt orange `#FF6B2C` primary accent with cobalt / green / amber / magenta as supporting colors, Bricolage Grotesque / DM Sans, a signature 2px near-black border with a flat drop shadow on cards and buttons.

Both designs included a hero search, a "how it works" three-step section, a filterable catalog of flippable path cards, and a closing call to action. Direction 1A additionally had a stats row presenting invented numbers (94% recall at 30 days, 1,240 paths curated, 12 minute median review) as if they were real product metrics, and an infinite ambient float/pulse animation on decorative shapes.

## Decision

Shipped 1B. Section 10 of CLAUDE.md was rewritten to the new palette and type system.

The fabricated stats row was not carried over in either direction — this product has no user base yet, so there is no real number to show. The landing page instead states real, verifiable facts about how the product works (the Leitner box schedule, the `??`/`>>` note syntax, free-ranked-first resources).

The design file's ambient looping animations (a floating decorative shape, a pulsing status dot) were dropped. Section 11's motion rule — nothing moves unless the user caused it — predates this design and wasn't part of what was being decided here; it still applies.

## Tradeoff accepted

1A's neon-on-black direction had more visual novelty. 1B was chosen for warmth and readability over a long study session, and because a light paper-like background fits "notes and studying" more directly than an arcade aesthetic marketed at a general audience.

Bricolage Grotesque at heavier weight replaces the previously specified serif for recall prompt text, to stay inside the new two-font system rather than introducing a third face just for the review screen. The "slow the eye down before the answer" goal is the same; the mechanism (weight/size instead of a serif face) is different.
