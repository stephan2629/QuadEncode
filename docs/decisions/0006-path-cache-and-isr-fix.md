# 0006: shared path cache, plus finishing the ISR fix from 0005

**Correction (2026-08-06):** this record originally claimed the middleware
fix below restored ISR caching for `/study/[query]`. That was never
verified and is wrong - see `docs/decisions/0007`, and `0008` for what the
real fix turned out to be (`generateStaticParams`, unrelated to middleware,
cookies, or fetch caching). The middleware fix is still correct and worth
keeping (public routes shouldn't run auth middleware regardless of ISR),
but the "measured effect" and "now it runs once per revalidation window"
framing below describes something that wasn't happening yet at the time it
was written. `path_cache` is what stopped repeat pipeline runs before real
ISR existed, and still does independent of it - that part of this record
is accurate and unchanged.

## Context

0005 added `export const revalidate = 604800` to `/study/[query]` and moved
the `indexed_subjects` bookkeeping write to a cookie-free client so the route
could actually be cached. Two gaps remained.

First, `src/proxy.ts`'s middleware matcher was broad enough to still run the
Supabase auth middleware on `/study/[query]`. `updateSession()` calls
`supabase.auth.getUser()`, which on a session refresh writes a `Set-Cookie`
header. A response carrying `Set-Cookie` is never CDN-cached, so every
request bypassed the ISR cache regardless of the `revalidate` export. The
matcher now lists only the routes `updateSession()` branches on
(`/dashboard`, `/notes`, `/review`, `/practice`, `/imports`, `/settings`,
`/login`) - public routes never run this middleware at all.

Second, ISR alone doesn't help in `next dev` (ISR is a no-op there) and
doesn't survive a redeploy or cache eviction in production - the first
visitor after either pays the full ~20s Serper + YouTube + Gemini +
link-check pipeline again. A database-level cache is the only thing that
helps in every environment, including the one most testing actually happens
in.

Separately, the existing client-side retry ("try a different path", capped
at 3 tries per query per browser via localStorage) surfaced a real UX
artifact: after a retry, reloading the page showed the server-rendered path
for one frame before a `useEffect` swapped in the localStorage copy.

## Decision

**`path_cache`, a shared table keyed by slug, not a per-user table.** Search
works signed out and a given subject's path is the same for every visitor -
there's no per-user dimension to cache along. This mirrors `indexed_subjects`
in the same file: public read, public insert/update, no user data. A public
`update` policy was added (not just `insert`) because a retry overwrites an
existing row rather than only ever creating a new one.

**Cache read and write both use `createPublicClient()`
(`src/utils/supabase/public.ts`), never `@/utils/supabase/server`'s
`createClient()`.** That client reads `cookies()` internally, and any
`cookies()` read in a route's render path forces Next.js to treat the whole
route as fully dynamic, silently disabling ISR no matter what `revalidate`
says. This is exactly the bug 0005 already fixed once for the
`indexed_subjects` write; the path_cache read/write sits in the same render
path and would reintroduce it if it used the cookie-aware client.

**30-day freshness window**, longer than 0005's 7-day ISR window - though per
the correction above, ISR isn't actually the backstop here; `path_cache` is
the only thing caching this route at all right now (see 0007). The window
was sized on the original two-layer premise (ISR handling the common case,
`path_cache` covering the ISR-miss cases: cold cache, `next dev`, a
redeploy), which turned out to be a one-layer system instead. 30 days is
still the right number for what it actually is: a curated resource list
goes stale on the order of months, not days. `isPathCacheFresh()` in
`src/lib/pathCache.ts` isolates the comparison from the database so it's
unit-testable, mirroring `src/lib/quota.ts`.

**A `skipCache` retry still overwrites the shared row.** The user retrying
has implicitly judged the cached path worse than what they're about to get.
Writing the new result back means every future first-time visitor to that
slug gets the improved path too, instead of the shared cache staying pinned
to whatever generated first. The alternative (retries stay purely
client-side, never touch the shared row) would mean one lucky retry never
benefits anyone else, and an unlucky first generation keeps costing every
subsequent visitor a bad path forever.

**The SSR-to-localStorage flash is fixed with `useLayoutEffect` (isomorphic,
guarded for SSR), not a loading state.** `useEffect` runs after the browser
paints, so a localStorage swap there is visibly a flash: SSR content, then a
jump to different content. `useLayoutEffect` runs synchronously before
paint, so the same swap is invisible on first render - the user just sees
final content. This was chosen over a skeleton or spinner because CLAUDE.md
section 13 already rules out covering already-rendered content with loading
UI just to hide a timing seam, and because the shared cache from Task 1
means this swap is now rare in practice (the SSR path itself is usually
already the latest cached one; the flash only remains for a user who retried
in a browser whose ISR snapshot hasn't caught up yet).

## Trade-off accepted

- **One bad generated path can be served to every visitor for up to 30
  days** until the window lapses or someone retries and overwrites it.
  Ponytail-flagged in `src/app/study/[query]/actions.ts` at the freshness
  check: shared, unmoderated cache is the simplest thing that cuts real
  token cost; a moderation or manual-invalidation path is the upgrade if a
  bad path turns out to need faster correction than a retry provides.
- `path_cache` and `indexed_subjects` now do two near-identical upserts on
  every fresh generation. Not merged into one table: `indexed_subjects` is
  sitemap bookkeeping keyed by the AI's own canonical slug and only ever
  grows; `path_cache` is keyed by the URL slug the user actually typed and
  is meant to be overwritten. Conflating them would make one of those two
  behaviors wrong.
