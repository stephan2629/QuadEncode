'use server';

import { generateText } from '@/lib/ai';
import { createClient } from '@/utils/supabase/server';
import { checkLinkStatus } from '@/lib/link-checker';
import { searchYouTube } from '@/lib/youtube';

export interface PathResource {
  title: string;
  url: string;
  provider: string;
  isFree: boolean;
  cost: string;
  format: string;
  description: string;
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

    const cleanQuery = query.replace(/-/g, ' ');

    // 1. Fetch Web Results from Serper
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: `${cleanQuery} full course tutorial guide` })
    });
    const serperData = await serperRes.json();

    // 2. Fetch Video Results from YouTube. Real video/playlist ids and URLs
    // are extracted here in code (see src/lib/youtube.ts), not left for the
    // model to guess, and results are sorted newest-first so the learner
    // gets current information regardless of subject.
    const ytCandidates = await searchYouTube(`${cleanQuery} full course tutorial`, youtubeKey);

    const prompt = `
      You are an expert curriculum designer. A user wants to learn about: "${cleanQuery}".

      Here are the top web search results:
      ${JSON.stringify(serperData.organic?.slice(0, 6) || [])}

      Here are candidate YouTube videos/playlists, sorted newest upload first. Prefer the most
      recently published candidate when more than one covers the material well, so the learner
      gets up-to-date information. Use these exact "url" values verbatim for any YouTube resource
      you pick - never invent or modify a YouTube URL:
      ${JSON.stringify(ytCandidates.slice(0, 6))}

      Create a highly curated learning path with 5 to 6 resources, selecting the absolute best
      options from the provided search results above. Do not use any URL that isn't present in
      the search results or YouTube candidates given to you.

      Ranking rules, in order:
      1. The very first resource (Step 1) MUST be the best, most comprehensive YouTube video or playlist tutorial from the YouTube candidates.
      2. Free resources (official docs, MDN-style references, GitHub repos, free YouTube videos)
         come before any paid course. List every free resource first.
      3. Within each tier, order beginner to advanced.
      4. Prefer official documentation and well-known, reputable sources over unfamiliar blogs.

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
            "description": "2-3 sentences explaining exactly what this covers and who it suits."
          }
        ]
      }
    `;

    const responseText = await generateText({ prompt, json: true });
    if (!responseText) throw new Error('No response from AI');

    const parsed = JSON.parse(responseText) as GeneratedPath;

    // Discard anything that doesn't actually resolve before it ever reaches
    // the database - an AI-curated path is only as trustworthy as its
    // weakest link. Checked in parallel since each check has its own 5s cap.
    const liveFlags = await Promise.all(
      (parsed.resources || []).map((r) => checkLinkStatus(r.url))
    );
    const liveResources = parsed.resources.filter((_, i) => liveFlags[i]);

    // Enforced in code, not just asked for in the prompt: a model can ignore
    // instructions, but a stable sort can't.
    const freeFirst = [...liveResources].sort(
      (a, b) => Number(b.isFree) - Number(a.isFree)
    );
    parsed.resources = freeFirst.slice(0, 5);

    if (parsed.resources.length === 0) {
      throw new Error('Every candidate resource failed its link check. Please try again.');
    }

    if (parsed?.slug && parsed?.subjectName) {
      try {
        const supabase = await createClient();
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
