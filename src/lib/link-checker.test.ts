import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkLinkStatus } from './link-checker'

describe('checkLinkStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))
    expect(await checkLinkStatus('https://example.com')).toBe(true)
  })

  it('accepts a 301/302 redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 301 }))
    expect(await checkLinkStatus('https://example.com')).toBe(true)
  })

  it('rejects a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404 }))
    expect(await checkLinkStatus('https://example.com/missing')).toBe(false)
  })

  it('rejects a malformed URL without hitting the network', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await checkLinkStatus('not-a-url')).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to GET when HEAD is rejected', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('HEAD not allowed')))
      .mockImplementationOnce(() => Promise.resolve({ status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await checkLinkStatus('https://example.com')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
