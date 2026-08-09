import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button, Card, Input } from '../components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(username, password)
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            GRS
          </div>
          <h1 className="text-xl font-semibold text-white">IPS Purchase Management</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to continue</p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Username"
              required
              autoFocus
              placeholder="e.g. admin or admin@grs.example"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Password"
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo accounts —{' '}
          <Link to="/register" className="text-blue-400 hover:underline">
            register
          </Link>
        </p>
      </div>
    </div>
  )
}
