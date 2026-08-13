import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button, Card, Input, Select } from '../components/ui'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    role: 'STORE_KEEPER',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await register({
        name: form.name,
        mobile: form.mobile,
        email: form.email || undefined,
        role: form.role,
        password: form.password,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
            Join the purchase workspace.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100">
            Create your account to raise requirements, track purchase orders and verify
            deliveries — all in one calm, clear place.
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
            <h1 className="text-xl font-semibold text-emerald-950">Create account</h1>
            <p className="mt-1 text-sm text-emerald-900/50">
              Join the IPS purchase management system
            </p>
          </div>

          <h1 className="text-2xl font-bold text-emerald-950">Create account</h1>
          <p className="mb-6 mt-1 text-sm text-emerald-900/50">
            Join the IPS purchase management system
          </p>

          <Card className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <Input
                label="Full Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Mobile"
                required
                placeholder="10-digit number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
              <Input
                label="Email (optional)"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Select
                label="Role"
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="STORE_KEEPER">STORE_KEEPER</option>
                <option value="MANAGER">MANAGER</option>
              </Select>
              <Input
                label="Password"
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Input
                label="Confirm Password"
                required
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg shadow-emerald-600/25"
                disabled={busy}
              >
                {busy ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-center text-xs text-emerald-900/50">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
