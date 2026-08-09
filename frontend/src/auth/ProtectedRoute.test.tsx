import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

const mocks = vi.hoisted(() => ({
  token: null as string | null,
  loading: false,
}))

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: null, token: mocks.token, loading: mocks.loading }),
}))

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>CONTENT</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mocks.token = null
    mocks.loading = false
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing while loading', () => {
    mocks.loading = true
    renderRoute()
    expect(screen.queryByText('CONTENT')).not.toBeInTheDocument()
    expect(screen.queryByText('LOGIN')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    renderRoute()
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
    expect(screen.queryByText('CONTENT')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    mocks.token = 'tok'
    renderRoute()
    expect(screen.getByText('CONTENT')).toBeInTheDocument()
    expect(screen.queryByText('LOGIN')).not.toBeInTheDocument()
  })
})
