# 0007: /study/[query] has never actually used ISR

## Context

0005 and 0006 both describe `/study/[query]` as ISR-cached: a 7-day
`export const revalidate`, with 0005 fixing a cookie dependency and 0006
fixing a middleware matcher, each framed as "this is what was defeating
ISR." Verifying 0006 against a real production build
(`next build && next start`, not `next dev`, which ignores ISR entirely and
so could never have caught this) showed neither fix mattered, because the
route was never entering Next's ISR system in the first place:

- `.next/prerender-manifest.json` has no entry for the route under either
  `routes` (build-time static) or `dynamicRoutes` (ISR-eligible dynamic
  segments) after a full build.
- Three identical requests to the same cached slug each re-ran
  `generatePath()` in full (confirmed with temporary logging), not just the
  first.
- `.next/cache` has no fetch-cache artifacts for the route.

**Root cause:** Next.js 15 changed `fetch()`'s default `cache` option from
`'force-cache'` to `'no-store'`. `generatePath()` calls `fetch()` directly
(Serper) and through `searchYouTube` / `generateText` / the Supabase client
(YouTube, Gemini, `path_cache` and `indexed_subjects` reads/writes) without
any of them opting into `{ cache: 'force-cache' }` or
`{ next: { revalidate } }`. In the app router's non-cache-components model
(this project doesn't set the `cacheComponents` flag - see
`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`,
required reading per `AGENTS.md` before touching this), a route's
page-level `export const revalidate` only raises the ceiling for fetches
that are *already* cacheable - it cannot retroactively cache a fetch that
opted out (or never opted in). A single uncached fetch anywhere in a
route's render path keeps the *entire* route dynamically rendered,
regardless of the page-level export. Every fetch in this route's render
path is uncached, so the export has done nothing since it was added.

This is exactly the kind of change `AGENTS.md` warns about ("this is NOT
the Next.js you know... read the docs before writing any code"). Nobody
- including this task, working from the same assumption - checked the
actual build artifacts before declaring the fix done, twice.

## Decision

**Correct the record rather than silently edit it.** 0005 and 0006 keep
their original (wrong) reasoning with a dated correction note pointing
here, instead of being rewritten as if the mistake never happened.

**This record documents the finding only; it does not fix it.**
`path_cache` (0006) already solves the problem that motivated all of this -
a subject's pipeline runs once, not once per visitor, verified live against
Postgres independent of ISR. What real ISR would add on top - Netlify's CDN
serving the page from its edge instead of the Node server round-tripping to
Postgres - is a latency optimization (tens of ms vs low hundreds), not a
cost one, and it touches every fetch this route's render path reaches
(Serper, YouTube, Gemini via `src/lib/ai.ts`, and the
`path_cache`/`indexed_subjects` Supabase calls), each with its own
correctness question - wide enough that it gets scoped and planned as its
own piece of work rather than folded into this correction.

**Update:** the fetch-caching diagnosis above was itself incomplete. See
`docs/decisions/0008` - the actual missing piece was `generateStaticParams`,
unrelated to any fetch's cache option.

**Leave `export const revalidate = 604800` in place.** Removing it changes
nothing today (it isn't doing anything to remove), and it's the correct
target state if the real fix ever gets built - deleting it would just mean
someone has to remember to add it back.

## Trade-off accepted

`/study/[query]` round-trips to Postgres on every single request instead of
being served as static HTML from Netlify's edge. For a public, SEO-facing
page this is a real latency cost (a Postgres read plus Next server
round-trip vs. a CDN hit) that this decision defers rather than fixes. If
that latency becomes the bottleneck worth addressing - as opposed to the
API cost, which `path_cache` already handles - the fetch-level caching
work above is the next step, done as its own scoped task.
