import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

const apiMock = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('../lib/api', () => ({
  api: apiMock,
  getToken: () => localStorage.getItem('grs_token'),
  getSessionUser: () => {
    const raw = localStorage.getItem('grs_user')
    return raw ? (JSON.parse(raw) as unknown) : null
  },
  setSession: (token: string, user: unknown) => {
    localStorage.setItem('grs_token', token)
    localStorage.setItem('grs_user', JSON.stringify(user))
  },
  clearSession: () => {
    localStorage.removeItem('grs_token')
    localStorage.removeItem('grs_user')
  },
}))

const authUser = {
  id: 1,
  name: 'A',
  mobile: '9999999999',
  email: null,
  role: 'MANAGER',
  status: 'ACTIVE',
  permissions: null,
  accessToken: 'tok-1',
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('logs in and stores the token and user', async () => {
    apiMock.post.mockResolvedValue(authUser)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('u', 'p')
    })
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', { username: 'u', password: 'p' })
    expect(result.current.token).toBe('tok-1')
    expect(result.current.user).toMatchObject({ name: 'A', role: 'MANAGER' })
    expect(localStorage.getItem('grs_token')).toBe('tok-1')
  })

  it('registers and stores the session', async () => {
    apiMock.post.mockResolvedValue(authUser)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.register({ name: 'X', role: 'STORE_KEEPER', password: 'secret' })
    })
    expect(apiMock.post).toHaveBeenCalledWith('/auth/register', {
      name: 'X',
      role: 'STORE_KEEPER',
      password: 'secret',
    })
    expect(result.current.user?.name).toBe('A')
  })

  it('exposes loading while a request is in flight', async () => {
    let resolve!: (v: unknown) => void
    apiMock.post.mockReturnValue(new Promise((r) => { resolve = r }))
    const { result } = renderHook(() => useAuth(), { wrapper })
    let pending!: Promise<void>
    act(() => {
      pending = result.current.login('u', 'p')
    })
    expect(result.current.loading).toBe(true)
    await act(async () => {
      resolve(authUser)
      await pending
    })
    expect(result.current.loading).toBe(false)
  })

  it('logs out and clears the session', async () => {
    localStorage.setItem('grs_token', 't')
    localStorage.setItem('grs_user', JSON.stringify({ id: 1, name: 'A' }))
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.token).toBe('t')
    act(() => result.current.logout())
    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('grs_token')).toBeNull()
  })

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider')
  })

  describe('hasFeature', () => {
    it('applies manager role defaults when permissions are unset', () => {
      localStorage.setItem(
        'grs_user',
        JSON.stringify({ id: 1, name: 'A', role: 'MANAGER', permissions: null }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.hasFeature('dashboard')).toBe(true)
      expect(result.current.hasFeature('requirements')).toBe(true)
      expect(result.current.hasFeature('purchase-orders')).toBe(true)
      expect(result.current.hasFeature('deliveries')).toBe(true)
      expect(result.current.hasFeature('discrepancies')).toBe(true)
      expect(result.current.hasFeature('vendors')).toBe(false)
    })

    it('applies store keeper defaults and gives purchasers nothing', () => {
      localStorage.setItem(
        'grs_user',
        JSON.stringify({ id: 1, name: 'A', role: 'STORE_KEEPER', permissions: null }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.hasFeature('dashboard')).toBe(true)
      expect(result.current.hasFeature('requirements')).toBe(true)
      expect(result.current.hasFeature('purchase-orders')).toBe(false)

      localStorage.setItem(
        'grs_user',
        JSON.stringify({ id: 1, name: 'A', role: 'PURCHASER', permissions: null }),
      )
      const { result: res2 } = renderHook(() => useAuth(), { wrapper })
      expect(res2.current.hasFeature('dashboard')).toBe(false)
      expect(res2.current.hasFeature('requirements')).toBe(false)
    })

    it('respects an explicit permission list', () => {
      localStorage.setItem(
        'grs_user',
        JSON.stringify({ id: 1, name: 'A', role: 'MANAGER', permissions: ['requirements', 'items'] }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.hasFeature('requirements')).toBe(true)
      expect(result.current.hasFeature('items')).toBe(true)
      expect(result.current.hasFeature('vendors')).toBe(false)
    })

    it('flags the user as admin by role', () => {
      localStorage.setItem(
        'grs_user',
        JSON.stringify({ id: 1, name: 'A', role: 'ADMIN', permissions: ['dashboard'] }),
      )
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.hasFeature('users')).toBe(true)
      expect(result.current.hasFeature('vendors')).toBe(false)
    })

    it('returns false when logged out', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.hasFeature('dashboard')).toBe(false)
      expect(result.current.isAdmin).toBe(false)
    })
  })
})
