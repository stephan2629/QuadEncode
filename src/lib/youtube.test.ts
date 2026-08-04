import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchYouTube } from './youtube'

describe('searchYouTube', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds real watch/playlist URLs from the API response instead of leaving them to the model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            items: [
              { id: { videoId: 'abc123' }, snippet: { title: 'Video', publishedAt: '2024-01-01', channelTitle: 'Ch' } },
              { id: { playlistId: 'xyz789' }, snippet: { title: 'Playlist', publishedAt: '2024-01-01', channelTitle: 'Ch' } },
              { id: {}, snippet: { title: 'No id, dropped' } },
            ],
          }),
      })
    )

    const results = await searchYouTube('music theory', 'fake-key')
    expect(results).toEqual([
      { title: 'Video', url: 'https://www.youtube.com/watch?v=abc123', provider: 'YouTube', format: 'video', publishedAt: '2024-01-01', channelTitle: 'Ch' },
      { title: 'Playlist', url: 'https://www.youtube.com/playlist?list=xyz789', provider: 'YouTube', format: 'video', publishedAt: '2024-01-01', channelTitle: 'Ch' },
    ])
  })

  it('sorts by upload date for every subject, not just fast-moving ones', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ items: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    await searchYouTube('AWS certification', 'fake-key')
    expect(fetchMock.mock.calls[0][0]).toContain('order=date')

    await searchYouTube('music theory', 'fake-key')
    expect(fetchMock.mock.calls[1][0]).toContain('order=date')
  })
})
