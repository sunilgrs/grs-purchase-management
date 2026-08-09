import type { ReactNode } from 'react'
import { useEffect } from 'react'
import type { StatusColor } from '../types'

const btnVariants: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
  success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
  onClick,
}: {
  children: ReactNode
  variant?: keyof typeof btnVariants
  size?: 'sm' | 'md'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}) {
  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${btnVariants[variant]} ${sizes} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <input
        {...props}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
        } ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Select({
  label,
  error,
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <select
        {...props}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
        } ${className}`}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Spinner({ className = 'h-5 w-5 text-blue-600' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const statusStyles: Record<StatusColor, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({
  children,
  color = 'slate',
}: {
  children: ReactNode
  color?: StatusColor
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles[color]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🗂️
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
      </div>
    </div>
  )
}

export function Table({
  headers,
  children,
}: {
  headers: ReactNode[]
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[90vh] w-full flex-col rounded-lg bg-white shadow-xl ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  error,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean
  title: string
  message: string
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
