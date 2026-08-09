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
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            GRS
          </div>
          <h1 className="text-xl font-semibold text-white">Create account</h1>
          <p className="mt-1 text-sm text-slate-400">Join the IPS purchase management system</p>
        </div>

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
              <option value="PURCHASER">PURCHASER</option>
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
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
