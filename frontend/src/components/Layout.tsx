import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import NotificationBell from './NotificationBell'

const navSections = [
  {
    label: 'Main',
    links: [
      { to: '/', label: 'Dashboard', feature: 'dashboard', icon: 'M3.75 3h16.5v16.5H3.75z M3.75 10.5h16.5 M10.5 3.75v16.5' },
    ],
  },
  {
    label: 'Master Data',
    links: [
      { to: '/vendors', label: 'Vendors', feature: 'vendors', icon: 'M12 3c-3 0-5 2-5 5 0 1 .4 2 .9 2.8L4 17l2 1 1.5-3.5L9 16l2 1 1-6c.4-.2.7-.3.9-.3' },
      { to: '/items', label: 'Items', feature: 'items', icon: 'M12 3l8 4-8 4-8-4 8-4z M4 11l8 4 8-4 M4 15l8 4 8-4' },
      { to: '/users', label: 'Users', feature: 'users', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 20a8 8 0 0116 0' },
    ],
  },
  {
    label: 'Procurement',
    links: [
      { to: '/requirements', label: 'Requirements', feature: 'requirements', icon: 'M4 4h16v12H8l-4 4V4z' },
      { to: '/purchase-orders', label: 'Purchase Orders', feature: 'purchase-orders', icon: 'M12 3v18 M3 12h18 M12 3l9 9-9 9-9-9 9-9' },
      { to: '/deliveries', label: 'Deliveries', feature: 'deliveries', icon: 'M3 7h11v10H3z M14 10h4l3 3v4h-7z' },
      { to: '/discrepancies', label: 'Discrepancies', feature: 'discrepancies', icon: 'M12 9v4 M12 17h.01 M12 3a9 9 0 100 18 9 9 0 000-18z' },
    ],
  },
  {
    label: 'Audit',
    links: [{ to: '/audit-logs', label: 'Audit Logs', feature: 'audit-logs', icon: 'M9 12h6 M9 16h6 M9 8h6 M4 3h16v18l-4-3-4 3-4-3-4 3V3z' }],
  },
  {
    label: 'Reporting',
    links: [{ to: '/reports', label: 'Reports', feature: 'reports', icon: 'M4 20h16 M6 20v-9 M12 20V5 M18 20v-6' }],
  },
]

export default function Layout() {
  const { user, logout, hasFeature } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => hasFeature(link.feature)),
    }))
    .filter((section) => section.links.length > 0)

  const settingsVisible = user?.role === 'ADMIN'

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-600/20'
        : 'text-emerald-900/70 hover:bg-emerald-50 hover:text-emerald-900'
    }`

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-emerald-100 bg-white px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-emerald-900/70 hover:bg-emerald-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            GRS
          </div>
        </div>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-emerald-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-emerald-100 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-emerald-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
            GRS
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-emerald-950">IPS Purchase Manager</p>
            <p className="text-xs text-emerald-900/40">v1.0.0</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-md p-1.5 text-emerald-900/40 hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-900/40">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.to === '/'}
                      onClick={() => setOpen(false)}
                      className={linkClass}
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        {link.icon.split(' ').map((d, i) => (
                          <path key={i} d={d} strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                      </svg>
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {settingsVisible && (
            <div className="mb-5">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-900/40">
                Administration
              </p>
              <ul className="space-y-0.5">
                <li>
                  <NavLink
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className={linkClass}
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 3l1.6 2.5 2.9-.6 1.3 2.7 2.7 1.3-.6 2.9L21.9 12l-.6 2.9.6 2.9-2.7 1.3-1.3 2.7-2.9-.6L12 21l-1.6-2.5-2.9.6-1.3-2.7-2.7-1.3.6-2.9L2.1 12l.6-2.9-.6-2.9 2.7-1.3 1.3-2.7 2.9.6z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Settings
                  </NavLink>
                </li>
              </ul>
            </div>
          )}
        </nav>

        <div className="border-t border-emerald-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-emerald-950">{user?.name}</p>
              <p className="truncate text-xs text-emerald-900/50">{user?.role}</p>
            </div>
            <div className="hidden lg:block">
              <NotificationBell placement="up" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-md p-1.5 text-emerald-900/40 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 12H3m0 0l4-4m-4 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 4h10a2 2 0 012 2v12a2 2 0 01-2 2H8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="px-4 py-5 pt-16 lg:ml-64 lg:px-8 lg:py-6 lg:pt-6">
        <Outlet />
      </main>
    </div>
  )
}
