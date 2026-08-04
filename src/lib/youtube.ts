export interface YouTubeCandidate {
  title: string
  url: string
  provider: 'YouTube'
  format: 'video'
  publishedAt: string
  channelTitle: string
}

// Sorted by upload date, not relevance score, for every subject - a learner
// searching "React hooks" or "Spanish verb conjugation" both get whatever's
// newest that still matches the query. YouTube's own keyword matching on `q`
// already filters for relevance; `order` only decides how those matches are
// sorted, so this doesn't risk surfacing something unrelated, and unlike a
// hard publishedAfter cutoff it can't zero out results for a niche topic
// that simply hasn't had a video uploaded recently.
export async function searchYouTube(query: string, apiKey: string): Promise<YouTubeCandidate[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video,playlist',
    maxResults: '8',
    order: 'date',
    q: query,
    key: apiKey,
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`)
  const data = await res.json()

  interface YouTubeSearchItem {
    id?: { videoId?: string; playlistId?: string }
    snippet?: { title?: string; publishedAt?: string; channelTitle?: string }
  }

  return ((data.items ?? []) as YouTubeSearchItem[])
    .map((item): YouTubeCandidate | null => {
      const videoId = item.id?.videoId
      const playlistId = item.id?.playlistId
      if (!videoId && !playlistId) return null

      return {
        title: item.snippet?.title ?? '',
        // Built from the API's own id, never left for the model to guess -
        // this is what keeps YouTube resources from turning into dead links.
        url: videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : `https://www.youtube.com/playlist?list=${playlistId}`,
        provider: 'YouTube',
        format: 'video',
        publishedAt: item.snippet?.publishedAt ?? '',
        channelTitle: item.snippet?.channelTitle ?? '',
      }
    })
    .filter((c): c is YouTubeCandidate => c !== null)
}
