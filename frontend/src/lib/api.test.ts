import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, ApiError, clearSession, getSessionUser, getToken, request, setSession } from './api'

describe('session helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads the token and user', () => {
    setSession('tok-1', { id: 1, name: 'A' })
    expect(getToken()).toBe('tok-1')
    expect(getSessionUser()).toEqual({ id: 1, name: 'A' })
  })

  it('returns nulls when nothing is stored', () => {
    expect(getToken()).toBeNull()
    expect(getSessionUser()).toBeNull()
  })

  it('returns null user for invalid JSON', () => {
    localStorage.setItem('grs_user', '{not-json')
    expect(getSessionUser()).toBeNull()
  })

  it('clears the session', () => {
    setSession('t', {})
    clearSession()
    expect(getToken()).toBeNull()
    expect(getSessionUser()).toBeNull()
  })
})

describe('request', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prepends /api and sets content and auth headers', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    setSession('tok', {})
    await request('/things', { method: 'POST', body: '{}' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/things',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok',
        }),
      }),
    )
  })

  it('returns parsed JSON on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ a: 1 }) })
    await expect(request('/x')).resolves.toEqual({ a: 1 })
  })

  it('returns undefined for a 204', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) })
    await expect(request('/x')).resolves.toBeUndefined()
  })

  it('throws an ApiError with the server message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })
    const err = await request('/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(401)
    expect((err as ApiError).message).toBe('Unauthorized')
  })

  it('joins array error messages', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: ['bad a', 'bad b'] }),
    })
    const err = await request('/x').catch((e: unknown) => e)
    expect((err as ApiError).message).toBe('bad a, bad b')
  })

  it('falls back to a status message when the body cannot be parsed', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('parse failed')
      },
    })
    const err = await request('/x').catch((e: unknown) => e)
    expect((err as ApiError).message).toBe('Request failed (500)')
  })
})

describe('api helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('delegates to fetch with the right methods', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await api.get('/g')
    await api.post('/p', { x: 1 })
    await api.patch('/pa', { x: 1 })
    await api.delete('/d')
    expect(fetchMock.mock.calls.map((c) => c[1].method)).toEqual([undefined, 'POST', 'PATCH', 'DELETE'])
  })
})
