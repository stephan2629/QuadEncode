'use server';

import { GoogleGenAI } from '@google/genai';

// We'll define the mock API responses here temporarily until the real keys are added
export async function generatePath(query: string) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const serperKey = process.env.SERPER_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;

    if (!geminiKey) throw new Error('Gemini API key is missing.');
    if (!serperKey) throw new Error('Serper API key is missing. Please add SERPER_API_KEY to .env.local');
    if (!youtubeKey) throw new Error('YouTube API key is missing. Please add YOUTUBE_API_KEY to .env.local');

    // 1. Fetch Web Results from Serper
    const serperRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: `${query.replace(/-/g, ' ')} full course tutorial guide` })
    });
    const serperData = await serperRes.json();

    // 2. Fetch Video Results from YouTube
    const ytQuery = encodeURIComponent(`${query.replace(/-/g, ' ')} full course tutorial`);
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist,video&maxResults=5&q=${ytQuery}&key=${youtubeKey}`);
    const ytData = await ytRes.json();

    // 3. Use Gemini to curate the path from the raw results
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    
    const prompt = `
      You are an expert curriculum designer. A user wants to learn about: "${query.replace(/-/g, ' ')}".
      
      Here are the top web search results:
      ${JSON.stringify(serperData.organic?.slice(0, 5) || [])}
      
      Here are the top YouTube search results:
      ${JSON.stringify(ytData.items?.slice(0, 5) || [])}
      
      Create a highly curated learning path with EXACTLY 5 resources, selecting the absolute best options from the provided search results.
      Mix free YouTube videos/playlists, free official documentation, and high-quality courses.
      Order them logically from beginner to advanced.
      
      Respond in this exact JSON format:
      {
        "subjectName": "Canonical Name of the Subject",
        "slug": "canonical-slug",
        "overview": "A short 1-2 sentence overview of what they will learn.",
        "resources": [
          {
            "title": "Title of Resource",
            "url": "https://example.com/url", // MUST be the real URL from the search results. For YouTube, use https://www.youtube.com/watch?v=VIDEO_ID or playlist?list=PLAYLIST_ID
            "provider": "Provider Name (e.g. YouTube, Udemy, AWS)",
            "isFree": true,
            "cost": "Free" or "$20",
            "format": "video" or "text",
            "description": "2-3 sentences explaining exactly what this covers and who it suits."
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (!response.text) throw new Error('No response from AI');
    
    const parsed = JSON.parse(response.text);
    return parsed;
    
  } catch (err: any) {
    console.error('Error generating path:', err);
    return { error: err.message || 'Failed to generate path' };
  }
}
