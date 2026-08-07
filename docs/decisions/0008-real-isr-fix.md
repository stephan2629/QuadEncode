# 0008: what actually made /study/[query] ISR-eligible

## Context

0007 documented that `/study/[query]` never entered Next's ISR system and
guessed the cause was Next 15+'s changed `fetch()` defaults (uncached
unless explicitly opted in). That diagnosis was half right and half a red
herring.

Isolated testing (two throwaway routes, `/isr-diag-a/[slug]` with zero
fetches or Server Actions and `/isr-diag-b/[slug]` with a trivial `'use
server'` data source, both deleted after the test) showed that **neither
fetch caching nor calling a Server Action from a Server Component was the
actual blocker.** Both diagnostic routes stayed fully dynamic - a fresh
`Date.now()` on every request - despite `export const revalidate = 604800`
and, in variant A, no data fetching of any kind.

Adding `export async function generateStaticParams() { return [] }` to
each diagnostic route flipped both from `ƒ` (dynamic) to `●` (SSG) in the
build output, and both immediately started serving identical, cached
content across repeat requests. **A dynamic segment page with no
`generateStaticParams` never registers with Next's ISR system in this
version, regardless of `revalidate` or what the render does or doesn't
fetch.** The canonical ISR example in
`node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration.md`
always pairs `revalidate` with `generateStaticParams` - this project had
the first without the second, on the assumption (carried over from older
Next versions and pre-App-Router mental models) that `revalidate` alone was
sufficient for a page that couldn't enumerate its params at build time.

The `unstable_cache`-wrapped `path_cache` read built for this fix (see the
implementation) turned out to be unnecessary for solving the caching
problem - a plain, uncached fetch works fine once the route is actually
registered for ISR, because Next's dynamic-vs-static determination for the
*first* on-demand render of a new param doesn't care what that render
fetched, only whether the route is ISR-eligible at all. It's kept anyway:
it does no harm, it means the one read that runs on every cache hit doesn't
add an extra Postgres round-trip within its own window, and reverting it
would be strictly more work than leaving it. What was NOT optional is the
`generateStaticParams` export and the `updateTag`/`revalidatePath` pair
after a `skipCache` retry's `path_cache` write - without a real invalidation
call, a retry now silently gets masked by Next's own route cache for up to
7 days, which never happened before this fix because there was no route
cache to mask it with.

## Decision

**Add `generateStaticParams() { return [] }` to `page.tsx`.** No params
known at build time; `dynamicParams` defaults to `true`, so an unknown slug
still renders on its first request and gets cached going forward. This is
the actual fix - everything else in this and the previous three records
was either already correct for unrelated reasons (the middleware matcher,
the cookie-free client) or additive but non-essential (`unstable_cache`).

**Correction (2026-08-06):** the first version of this fix called `updateTag`
+ `revalidatePath` on every `path_cache` write, including first-generation.
That crashed in practice: `generatePath` is invoked directly from
`PathRenderer`'s own render for the initial/cache-miss load, and Next
forbids calling either function "during render" - only a genuine
client-invoked Server Action call (the retry path) is allowed to. Both
calls are now gated behind `skipCache`. This isn't a loss: first-generation
never needed them anyway, since that render's own output becomes the fresh
ISR cache entry directly - there's nothing stale left to bust.

**Keep the `unstable_cache`-wrapped read and the `updateTag` +
`revalidatePath` pair on a `skipCache` retry.** Two
independent cache layers now exist - Next's route cache (busted by
`revalidatePath`, via auto-generated "soft tags") and the Data Cache entry
from `unstable_cache` (busted by `updateTag`, via the explicit tag it was
given) - and neither invalidation cascades into the other per
`node_modules/next/dist/docs/01-app/02-guides/how-revalidation-works.md`.
On a retry, skipping either one breaks a real scenario: skip `updateTag`
and the next non-`skipCache` visit to that slug still reads the pre-retry
row out of the Data Cache (it bypassed Postgres, not just the route cache);
skip `revalidatePath` and the CDN/route cache keeps serving the pre-retry
HTML for up to 7 days regardless of what Postgres or the Data Cache say.

**`updateTag`, not `revalidateTag`.** This Next version's `revalidateTag`
requires a second `profile` argument and, with the recommended
`profile="max"`, gives stale-while-revalidate semantics (serves the just-
superseded value once more, refreshes in the background) - wrong for a
call site that specifically exists to prevent a superseded value from being
served even once. `updateTag(tag)` is the one-argument, immediate,
read-your-own-writes primitive, Server-Action-only (which `generatePath`
already is).

## Trade-off accepted

Verified with `next build && next start` only, not an actual Netlify
deploy. `x-nextjs-cache: HIT`/`MISS` and `Cache-Control: s-maxage=604800,
stale-while-revalidate=...` confirm Next's own route cache works correctly
self-hosted; whether `updateTag`/`revalidatePath` propagate correctly
through Netlify's official Next.js Runtime (which implements ISR via
Netlify Blobs, per CLAUDE.md's stack section) in a multi-instance
deployment was not independently checked here, per
`how-revalidation-works.md`'s note that on-demand revalidation is a
local-instance operation unless the platform's cache handler shares
invalidation state - expected to work since that's the entire purpose of
the official plugin, but confirm on the next real deploy rather than assume.
