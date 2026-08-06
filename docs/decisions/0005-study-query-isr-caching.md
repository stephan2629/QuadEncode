# 0005: ISR caching for /study/[query]

## Context

Section 16 already specified static pages "generated at build time or with
ISR, never client side" for `/study/[slug]`, but the route had no
`revalidate` export and ran the full Serper + YouTube + Gemini + link-check
pipeline live on every request - measured at 21.5s total load time in
production, on a public, SEO-indexed page.

Adding `export const revalidate` alone didn't fix it. The route's data
comes from calling the `generatePath` Server Action directly from the page
component. That action did a best-effort SEO bookkeeping upsert (recording
the slug/name in `indexed_subjects`) through `@/utils/supabase/server`'s
`createClient()`, which reads `cookies()` internally. Touching `cookies()`
anywhere in a route's render path forces Next.js to treat the whole route
as fully dynamic, silently disabling ISR regardless of any `revalidate`
export - so the caching this section already called for was never actually
possible with that upsert in the render path, independent of whether
anyone remembered to add the export.

## Decision

**A cookie-free Supabase client for writes that don't need per-user
context.** `src/utils/supabase/public.ts` wraps `@supabase/supabase-js`'s
plain `createClient` (same anon key, no cookie plumbing) instead of the
`@supabase/ssr` server client. The `indexed_subjects` upsert doesn't need
to know which user is searching - it's public bookkeeping for the sitemap,
already anonymous-safe since search itself works signed out - so this
swap changes nothing about what the write is allowed to do, only removes
its accidental dependency on `cookies()`.

**`export const revalidate = 604800` (7 days), not a shorter window.** A
curated resource list doesn't go stale hour to hour. The first visitor
after the window pays the generation cost once; every visitor inside it
gets the cached page. Shortening this later is a one-line change if 7 days
turns out too long for some subject.

**Did not touch the local-provider `## Imported Raw Text` heading path in
`generatePath`'s sibling import flow** - unrelated code path, no cookie
dependency there to begin with.
