'use server';

import { unstable_cache } from 'next/cache';
import { generateText } from '@/lib/ai';
import { createPublicClient } from '@/utils/supabase/public';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkLinkStatus } from '@/lib/link-checker';
import { searchYouTube } from '@/lib/youtube';
import { normalizeCertPlus } from '@/lib/certQuery';
import { isPathCacheFresh, pathCacheKey } from '@/lib/pathCache';
import {
  detectCertification,
  enforceCertShape,
  isBlockedSource,
  type CertStep,
  type Certification,
} from '@/lib/certShape';
import { getHardcodedCertPath } from '@/lib/certPaths';

// The one fetch that runs on every cache-hit render (the common case: any
// repeat visit to an already-generated subject). Wrapped in unstable_cache
// so that render contains no uncached fetch and Next can actually treat the
// page as ISR-eligible - see docs/decisions/0007 and 0008. Deliberately not
// touching the Serper/YouTube/Gemini/link-check calls further down: those
// only run on a miss, where dynamic rendering is correct and expected.
function readPathCache(slug: string) {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from('path_cache')
        .select('subject_name, overview, resources, generated_at')
        .eq('slug', slug)
        .maybeSingle();
      return data;
    },
    ['path-cache-lookup', slug],
    { revalidate: 604800, tags: [`path-cache:${slug}`] }
  )();
}

export interface PathResource {
  title: string;
  url: string;
  provider: string;
  isFree: boolean;
  cost: string;
  format: string;
  description: string;
  // Set only on a certification path, and constrained to three values the
  // model cannot add to - the old free-text `stage` let it invent its own
  // progression, which is the bug this replaced. Absent entirely for a
  // normal subject/skill query, which stays a flat path.
  step?: CertStep;
  // Optional label for a certification made of more than one exam (A+ Core 1
  // and Core 2). Groups the course step per exam; single-exam certs omit it.
  exam?: string;
}

export interface GeneratedPath {
  subjectName: string;
  slug: string;
  overview: string;
  resources: PathResource[];
  // Certification paths only: which of the three steps came back empty. Said
  // out loud in the UI rather than silently shipping a two-step path.
  missingSteps?: CertStep[];
}

async function serperSearch(q: string, key: string) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q }),
  });
  const data = await res.json();
  return (data.organic ?? []) as unknown[];
}

// Only the certification branch needs these. The base search rarely surfaces
// a Udemy course or the vendor's own objectives page, and the model is barred
// from inventing a URL, so without them the course and exam-prep steps have
// nothing to be filled from.
function certSearches(cert: Certification, query: string): string[] {
  return [
    `${query} course site:udemy.com`,
    `${query} exam objectives free practice questions site:${cert.domains[0]}`,
  ];
}

// We'll define the mock API responses here temporarily until the real keys are added
export async function generatePath(query: string): Promise<GeneratedPath | { error: string }> {
  try {
    if (query.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query)) {
      return { error: 'Enter a subject using letters, numbers, and spaces.' };
    }
    const cleanQuery = query.replace(/-/g, ' ').trim();
    const searchQuery = normalizeCertPlus(cleanQuery);

    // 0. Upfront Validation: Query must be at least 3 characters and not pure digits
    if (cleanQuery.length < 3 || /^\d+$/.test(cleanQuery)) {
      return { error: `"${cleanQuery}" is too short or ambiguous. Please enter a specific subject, certification, or skill (e.g. "CompTIA Security+", "Spanish Vocabulary", "AWS").` };
    }

    // Common non-educational words filter
    const genericObjects = new Set(['hamburger', 'burger', 'pizza', 'taco', 'sandwich', 'apple', 'banana', 'shoe', 'pencil', 'table', 'chair', 'car', 'door']);
    if (genericObjects.has(cleanQuery.toLowerCase())) {
      return { error: `"${cleanQuery}" is an everyday item, not an educational subject or skill. Try searching for a specific topic like "Culinary Arts", "Nutrition Science", or "CompTIA Security+".` };
    }

    // `query` is already the lowercase, dash-normalized URL slug (built
    // client-side on the home page before the router.push to /study/[query]),
    // so it doubles as the path_cache key with no extra canonicalization.
    // Cookie-free client per docs/decisions/0005 and 0006 - any cookies()
    // read here would make this whole ISR route dynamic again.
    const cacheSlug = query.toLowerCase().trim();

    // Versioned, so the format change below doesn't keep serving old-shape
    // rows for 30 days (see docs/decisions/0010).
    const cacheRow = pathCacheKey(cacheSlug);
    const cert = detectCertification(searchQuery);

    // CompTIA A+/Network+/Security+ are hardcoded (see lib/certPaths.ts) and
    // never touch the live pipeline below - no path_cache read/write, no
    // Serper/YouTube/Gemini calls, no link check needed since every URL in
    // there was checked by hand before being committed.
    const hardcoded = getHardcodedCertPath(searchQuery);
    if (hardcoded) {
      try {
        await createAdminClient()
          .from('indexed_subjects')
          .upsert({ slug: cacheSlug, name: hardcoded.subjectName }, { onConflict: 'slug', ignoreDuplicates: true });
      } catch (e) {
        console.error('Failed to register indexed subject:', e);
      }
      return { subjectName: hardcoded.subjectName, slug: cacheSlug, overview: hardcoded.overview, resources: hardcoded.resources };
    }

    // Shared cache, one row per slug and no per-user variant. A generated
    // path is reused until its freshness window expires.
    const cached = await readPathCache(cacheRow);

    if (cached && isPathCacheFresh(new Date(cached.generated_at), new Date(), !!cert)) {
      return {
        subjectName: cached.subject_name,
        slug: cacheSlug,
        overview: cached.overview,
        resources: cached.resources as PathResource[],
      };
    }

    // Only needed from here down - the hardcoded certs and a path_cache hit
    // above both return before ever calling Serper/YouTube.
    const serperKey = process.env.SERPER_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    if (!serperKey) throw new Error('Serper API key is missing. Please add SERPER_API_KEY to .env.local');
    if (!youtubeKey) throw new Error('YouTube API key is missing. Please add YOUTUBE_API_KEY to .env.local');

    // 1. Fetch Web Results from Serper. A certification adds two targeted
    // searches (Udemy, the vendor's own site) alongside the general one.
    const organic = (
      await Promise.all(
        [
          `${searchQuery} full course tutorial guide`,
          ...(cert ? certSearches(cert, searchQuery) : []),
        ].map((q) => serperSearch(q, serperKey))
      )
    ).flat();

    // 2. Fetch Video Results from YouTube. For a certification the free
    // course slot is pinned to a named educator and sorted by relevance, not
    // upload date: newest-first surfaces a clip or a livestream from the
    // right channel rather than the full course for the current exam code.
    const ytPlaylists = await searchYouTube(
      cert ? `${searchQuery} ${cert.freeCreator ?? ''} full course playlist` : `${searchQuery} full course playlist`,
      youtubeKey,
      { type: 'playlist', order: 'relevance', maxResults: '4' }
    );
    const ytVideos = await searchYouTube(`${searchQuery} full course tutorial`, youtubeKey, {
      type: 'video',
      order: cert ? 'relevance' : 'date',
      maxResults: '4',
    });
    const ytCandidates = [...ytPlaylists, ...ytVideos];

    // The shape is enforced in code by enforceCertShape() after this returns;
    // asking for it here just means fewer resources get thrown away.
    const certPrompt = cert
      ? `
      THIS IS A CERTIFICATION. Return exactly this shape, with a "step" on every resource:
      1. "overview": one page on the official vendor site (${cert.domains.join(' or ')}) with the
         exam objectives. Nothing else may take this step.
      2. "course": exactly two resources, both covering the whole exam. The free one must be a
         YouTube playlist or full course video${cert.freeCreator ? ` (prefer ${cert.freeCreator})` : ''}, and it is listed first.
         The paid one must be a udemy.com course${cert.paidCreator ? ` (prefer ${cert.paidCreator})` : ''}. Match the current exam code, not
         the newest upload date. If the certification takes more than one exam, repeat the pair
         per exam and set "exam" to that exam's name and code on all four.
      3. "exam-prep": one or two practice tests, question banks, quizzes, or study guides, from
         ${cert.domains.join(' or ')} or udemy.com only. Never a forum, a subreddit, or a site
         selling leaked exam questions. If the vendor publishes free practice questions or a free
         quiz, that one comes first with "isFree": true. If a resource is discounted, bundled with
         an exam voucher, or has a free tier before you pay, say so in "cost" (for example
         "Free practice questions" or "$239, cheaper bundled with a retake voucher") rather than
         just "Paid".
      Nothing outside those three steps. A resource that fits none of them is dropped.
`
      : '';

    const prompt = `
      You are an expert curriculum designer. A user wants to learn about: "${searchQuery}".

      STRICT TOPIC VALIDATION RULE:
      Evaluate if "${searchQuery}" is a real, structured educational topic, academic subject, technical certification, language, software tool, or professional skill.
      If it is a random object, fast food item, single non-educational noun, gibberish, profanity, or not a real course topic, respond with EXACTLY this JSON and nothing else:
      {"error": "not_a_subject"}

      Otherwise, continue below.

      Here are the top web search results:
      ${JSON.stringify(organic.slice(0, cert ? 14 : 6))}

      Here are candidate YouTube videos/playlists. ${cert
        ? 'Pick the one matching the current exam code and covering the whole exam, not the newest upload: a recent clip or livestream from the right channel is not the course.'
        : 'Prefer the most recently published candidate when more than one covers the material well, so the learner gets up-to-date information.'}
      Use these exact "url" values verbatim for any YouTube resource you pick - never invent or
      modify a YouTube URL:
      ${JSON.stringify(ytCandidates.slice(0, 6))}

${certPrompt}
      Create a highly curated learning path with 5 to 6 resources, selecting the absolute best
      options from the provided search results above. Do not use any URL that isn't present in the
      search results or YouTube candidates given to you.

      Ranking rules, in order:
      1. Free-First Ranking Engine: Free video courses (especially structured YouTube playlists) MUST always rank above paid platforms or generic article sites. On a certification path this applies within each step, not just once overall.
      2. Top Free Creator Priority: For standard certifications/topics with well-known free educators (e.g., Professor Messer for CompTIA A+, Network+, Security+, freeCodeCamp, Stephane Maarek or AWS's own free video courses, NetworkChuck), you MUST explicitly surface their free YouTube courses/playlists as the #1 ranked resource in the relevant step.
      3. Full playlist courses (from YouTube Data API) must be ranked higher than fragmented blog posts, landing pages, or paid sites like Udemy/Coursera.
      4. Within each tier, order beginner to advanced.
      5. Prefer official documentation and well-known, reputable sources over unfamiliar blogs.

      Each "description" is 2-3 plain sentences stating exactly what the resource covers and who
      it suits. Write like a knowledgeable person, not a press release: no words like "vibrant",
      "seamless", "unlock", "empower", or "revolutionize", no em dashes, and no filler like
      "in today's fast-paced world."

      Respond in this exact JSON format:
      {
        "subjectName": "Canonical Name of the Subject",
        "slug": "canonical-slug",
        "overview": "A short 1-2 sentence overview of what they will learn.",
        "resources": [
          {
            "title": "Title of Resource",
            "url": "https://example.com/url",
            "provider": "Provider Name (e.g. YouTube, Udemy, AWS)",
            "isFree": true,
            "cost": "Free" or "$20",
            "format": "video" or "text",
            "description": "2-3 sentences explaining exactly what this covers and who it suits.",
            "step": ${cert ? '"overview" | "course" | "exam-prep" - required on every resource.' : '"omit this field entirely."'}
          }
        ]
      }
    `;

    const responseText = await generateText({ prompt, json: true });
    if (!responseText) throw new Error('No response from AI');

    const parsed = JSON.parse(responseText) as GeneratedPath | { error: string };

    if ('error' in parsed) {
      return { error: `"${cleanQuery}" doesn't look like a skill, subject, or certification. Try something like "Spanish vocabulary" or "AWS Solutions Architect".` };
    }

    // Discard anything that doesn't actually resolve before it ever reaches
    // the database - an AI-curated path is only as trustworthy as its
    // weakest link. Checked in parallel since each check has its own 5s cap.
    // Blocked sources go first: no point spending a link check on a resource
    // that will be dropped either way, and the ban applies to every path, not
    // only certification ones.
    const allowed = (parsed.resources || []).filter((r) => !isBlockedSource(r.url));
    const liveFlags = await Promise.all(allowed.map((r) => checkLinkStatus(r.url)));
    const liveResources = allowed.filter((_, i) => liveFlags[i]);

    // Enforced in code, not just asked for in the prompt: a model can ignore
    // instructions, but a filter can't. A certification gets the fixed
    // overview -> course -> exam-prep shape (and only trusted sources in it);
    // a skill or subject keeps the flat, free-first list it always had.
    if (cert) {
      const shaped = enforceCertShape(liveResources, cert);
      parsed.resources = shaped.resources;
      parsed.missingSteps = shaped.missing.length ? shaped.missing : undefined;
    } else {
      parsed.resources = liveResources
        .sort((a, b) => Number(b.isFree) - Number(a.isFree))
        .slice(0, 5);
    }

    if (parsed.resources.length === 0) {
      throw new Error('No resource survived the link and source checks for this search. Please try again.');
    }

    if (parsed?.slug && parsed?.subjectName) {
      try {
        await createAdminClient()
          .from('indexed_subjects')
          .upsert({ slug: parsed.slug, name: parsed.subjectName }, { onConflict: 'slug', ignoreDuplicates: true });
      } catch (e) {
        // Best-effort SEO bookkeeping — never block the path the user is waiting on.
        console.error('Failed to register indexed subject:', e);
      }
    }

    try {
      // Store the generated result for future visitors.
      await createAdminClient().from('path_cache').upsert({
        slug: cacheRow,
        subject_name: parsed.subjectName,
        overview: parsed.overview,
        resources: parsed.resources,
        generated_at: new Date().toISOString(),
      });
    } catch (e) {
      // A caching problem must never break the search the user is waiting on.
      console.error('Failed to write path cache:', e);
    }

    return parsed;

  } catch (err: unknown) {
    console.error('Error generating path:', err);
    let errorMessage = (err as Error).message || 'Failed to generate path';

    // Make AI provider errors more user-friendly instead of dumping raw JSON
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = "The AI provider's rate limit or daily quota was exceeded. Please wait a bit and try again, or check your API billing plan.";
    } else if (errorMessage.includes('All AI providers failed')) {
      errorMessage = 'The AI generator is temporarily unavailable across every provider. Please try again shortly.';
    } else if (errorMessage.includes('404')) {
      errorMessage = "The requested AI model is currently unavailable or deprecated. Please check your API configuration.";
    } else if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
      errorMessage = "The AI model is currently experiencing high demand. Please try again in a few moments.";
    }

    return { error: errorMessage };
  }
}
