import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { act } from 'react'
import { useFetch, useApiAction } from './useFetch'

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('../lib/api', () => ({ api: apiMock }))

describe('useFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads data from the API', async () => {
    apiMock.get.mockResolvedValue([1, 2, 3])
    const { result } = renderHook(() => useFetch<number[]>('/numbers'))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual([1, 2, 3]))
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('captures error messages', async () => {
    apiMock.get.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useFetch<number[]>('/numbers'))
    await waitFor(() => expect(result.current.error).toBe('boom'))
    expect(result.current.data).toBeNull()
  })

  it('reloads by re-fetching from the API', async () => {
    apiMock.get.mockResolvedValue([1])
    const { result } = renderHook(() => useFetch<number[]>('/numbers'))
    await waitFor(() => expect(result.current.data).toEqual([1]))
    expect(apiMock.get).toHaveBeenCalledTimes(1)
    act(() => result.current.reload())
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledTimes(2))
  })

  it('does nothing for a null path', () => {
    const { result } = renderHook(() => useFetch<number[]>(null))
    expect(result.current.loading).toBe(false)
    expect(apiMock.get).not.toHaveBeenCalled()
  })

  it('re-fetches on an interval when pollIntervalMs is set', async () => {
    vi.useFakeTimers()
    apiMock.get.mockResolvedValue([1])
    const { result, unmount } = renderHook(() => useFetch<number[]>('/numbers', 30_000))
    expect(apiMock.get).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(apiMock.get).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual([1])
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(apiMock.get).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('ignores results after unmount', async () => {
    let resolve!: (v: number[]) => void
    apiMock.get.mockImplementation(() => new Promise((r) => (resolve = r)))
    const { unmount } = renderHook(() => useFetch<number[]>('/numbers'))
    unmount()
    await act(async () => {
      resolve([1, 2])
    })
    expect(apiMock.get).toHaveBeenCalledTimes(1)
  })

  it('ignores errors after unmount', async () => {
    let reject!: (e: Error) => void
    apiMock.get.mockImplementation(() => new Promise((_, rj) => (reject = rj)))
    const { unmount } = renderHook(() => useFetch<number[]>('/numbers'))
    unmount()
    await act(async () => {
      reject(new Error('late'))
    })
    expect(apiMock.get).toHaveBeenCalledTimes(1)
  })
})

describe('useApiAction', () => {
  it('returns the result on success', async () => {
    const { result } = renderHook(() => useApiAction())
    await act(async () => {
      const res = await result.current.run(async () => 42)
      expect(res).toBe(42)
    })
    expect(result.current.submitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('captures error message and returns undefined', async () => {
    const { result } = renderHook(() => useApiAction())
    await act(async () => {
      const res = await result.current.run(async () => {
        throw new Error('nope')
      })
      expect(res).toBeUndefined()
    })
    expect(result.current.error).toBe('nope')
  })

  it('toggles submitting around the async call', async () => {
    let resolve!: (v: number) => void
    const { result } = renderHook(() => useApiAction())
    const promise = new Promise<number>((r) => {
      resolve = r
    })
    let pending!: Promise<number | undefined>
    act(() => {
      pending = result.current.run(() => promise)
    })
    expect(result.current.submitting).toBe(true)
    await act(async () => {
      resolve(1)
      await pending
    })
    expect(result.current.submitting).toBe(false)
  })

  it('clearError resets the error', async () => {
    const { result } = renderHook(() => useApiAction())
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('x')
      })
    })
    expect(result.current.error).toBe('x')
    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('falls back to a generic message for non-Error throws', async () => {
    const { result } = renderHook(() => useApiAction())
    await act(async () => {
      await result.current.run(async () => {
        throw 'string error'
      })
    })
    expect(result.current.error).toBe('Something went wrong')
  })
})
