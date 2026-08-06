'use server';

import { generateText } from '@/lib/ai';
import { createPublicClient } from '@/utils/supabase/public';
import { checkLinkStatus } from '@/lib/link-checker';
import { searchYouTube } from '@/lib/youtube';
import { normalizeCertPlus } from '@/lib/certQuery';

export interface PathResource {
  title: string;
  url: string;
  provider: string;
  isFree: boolean;
  cost: string;
  format: string;
  description: string;
  // Set only for certification/exam paths that need a multi-part
  // progression (e.g. "Prerequisites", "Core exam objectives", or a named
  // cert in a trifecta like "Network+"). Absent entirely for a normal
  // subject/skill query, which stays a flat path.
  stage?: string;
}

export interface GeneratedPath {
  subjectName: string;
  slug: string;
  overview: string;
  resources: PathResource[];
}

// We'll define the mock API responses here temporarily until the real keys are added
export async function generatePath(query: string): Promise<GeneratedPath | { error: string }> {
  try {
    const serperKey = process.env.SERPER_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;

    if (!serperKey) throw new Error('Serper API key is missing. Please add SERPER_API_KEY to .env.local');
    if (!youtubeKey) throw new Error('YouTube API key is missing. Please add YOUTUBE_API_KEY to .env.local');

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

    // 1. Fetch Web Results from Serper
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: `${searchQuery} full course tutorial guide` })
    });
    const serperData = await serperRes.json();

    // 2. Fetch Video Results from YouTube
    const ytPlaylists = await searchYouTube(`${searchQuery} full course playlist`, youtubeKey, { type: 'playlist', order: 'relevance', maxResults: '4' });
    const ytVideos = await searchYouTube(`${searchQuery} full course tutorial`, youtubeKey, { type: 'video', order: 'date', maxResults: '4' });
    const ytCandidates = [...ytPlaylists, ...ytVideos];

    const prompt = `
      You are an expert curriculum designer. A user wants to learn about: "${searchQuery}".

      STRICT TOPIC VALIDATION RULE:
      Evaluate if "${searchQuery}" is a real, structured educational topic, academic subject, technical certification, language, software tool, or professional skill.
      If it is a random object, fast food item, single non-educational noun, gibberish, profanity, or not a real course topic, respond with EXACTLY this JSON and nothing else:
      {"error": "not_a_subject"}

      Otherwise, continue below.

      Here are the top web search results:
      ${JSON.stringify(serperData.organic?.slice(0, 6) || [])}

      Here are candidate YouTube videos/playlists, sorted newest upload first. Prefer the most
      recently published candidate when more than one covers the material well, so the learner
      gets up-to-date information. Use these exact "url" values verbatim for any YouTube resource
      you pick - never invent or modify a YouTube URL:
      ${JSON.stringify(ytCandidates.slice(0, 6))}

      CERTIFICATION / MULTI-STAGE DETECTION:
      If "${searchQuery}" names a certification, credential, or exam prep target (e.g. a CompTIA
      exam, AWS Solutions Architect, CCNA, Azure Fundamentals, PMP), do not return a single flat
      course list. Instead structure the path into logical stages covering the full progression a
      learner needs, and set a "stage" field on every resource naming the stage it belongs to, for
      example "Prerequisites", "Core exam objectives", "Practice & revision". If the query implies
      a standard multi-part track (the CompTIA trifecta: A+ -> Network+ -> Security+), use each
      certification as its own stage in order, covering the complete progression rather than just
      the first one named. For a normal subject or skill query that isn't cert-shaped, omit the
      "stage" field entirely and return a flat path exactly as before.

      Create a highly curated learning path with 5 to 6 resources for a normal subject, or up to
      15 resources spread across all stages combined for a certification/multi-stage path,
      selecting the absolute best options from the provided search results above. Do not use any
      URL that isn't present in the search results or YouTube candidates given to you.

      Ranking rules, in order:
      1. Free-First Ranking Engine: Free video courses (especially structured YouTube playlists) MUST always rank above paid platforms or generic article sites. For a staged/certification path, this applies within every stage, not just once overall.
      2. Top Free Creator Priority: For standard certifications/topics with well-known free educators (e.g., Professor Messer for CompTIA A+, Network+, Security+, freeCodeCamp, Stephane Maarek or AWS's own free video courses, NetworkChuck), you MUST explicitly surface their free YouTube courses/playlists as the #1 ranked resource in the relevant stage.
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
            "stage": "Only for certification/multi-stage paths - omit entirely otherwise."
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
    const liveFlags = await Promise.all(
      (parsed.resources || []).map((r) => checkLinkStatus(r.url))
    );
    const liveResources = parsed.resources.filter((_, i) => liveFlags[i]);

    // Enforced in code, not just asked for in the prompt: a model can ignore
    // instructions, but a stable sort can't. Sorted free-first within each
    // stage rather than across the flattened list, so a certification
    // path's progression order survives the sort instead of every free
    // resource from every stage floating to the very top.
    const stageOrder: string[] = [];
    for (const r of liveResources) {
      const stage = r.stage ?? '';
      if (!stageOrder.includes(stage)) stageOrder.push(stage);
    }
    const freeFirst = stageOrder.flatMap((stage) =>
      liveResources
        .filter((r) => (r.stage ?? '') === stage)
        .sort((a, b) => Number(b.isFree) - Number(a.isFree))
    );

    const isStaged = liveResources.some((r) => r.stage);
    parsed.resources = freeFirst.slice(0, isStaged ? 15 : 5);

    if (parsed.resources.length === 0) {
      throw new Error('Every candidate resource failed its link check. Please try again.');
    }

    if (parsed?.slug && parsed?.subjectName) {
      try {
        const supabase = createPublicClient();
        await supabase
          .from('indexed_subjects')
          .upsert({ slug: parsed.slug, name: parsed.subjectName }, { onConflict: 'slug', ignoreDuplicates: true });
      } catch (e) {
        // Best-effort SEO bookkeeping — never block the path the user is waiting on.
        console.error('Failed to register indexed subject:', e);
      }
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
