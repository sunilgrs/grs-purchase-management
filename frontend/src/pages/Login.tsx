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
    <div className="min-h-screen bg-[#f6faf7] lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-600 p-12 text-emerald-50 lg:flex">
        <div
          className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,.28), transparent 65%)' }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-800">
            GRS
          </div>
          <div>
            <p className="text-sm font-semibold">IPS Purchase Manager</p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-200">Fresh Procurement</p>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-snug">
            Fresh, calm and clear purchasing.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100">
            An airy, light workspace that keeps procurement tidy — requirement to verified
            delivery, without the clutter.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Requirements', 'Approvals', 'Deliveries', 'Discrepancies'].map((t) => (
              <span
                key={t}
                className="rounded-full border border-emerald-400/35 bg-emerald-400/15 px-3 py-1 text-xs text-emerald-100"
              >
                ✓ {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-800 ring-1 ring-emerald-200">
              GRS
            </div>
            <h1 className="text-xl font-semibold text-emerald-950">IPS Purchase Management</h1>
            <p className="mt-1 text-sm text-emerald-900/50">Sign in to continue</p>
          </div>

          <h1 className="text-2xl font-bold text-emerald-950">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-emerald-900/50">Sign in to your account</p>

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
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg shadow-emerald-600/25"
                disabled={busy}
              >
                {busy ? 'Signing in…' : 'Sign in →'}
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-center text-xs text-emerald-900/50">
            Demo accounts —{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
              register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
