import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const navSections = [
  {
    label: 'Main',
    links: [
      { to: '/', label: 'Dashboard', icon: 'M3.75 3h16.5v16.5H3.75z M3.75 10.5h16.5 M10.5 3.75v16.5' },
    ],
  },
  {
    label: 'Master Data',
    links: [
      { to: '/vendors', label: 'Vendors', icon: 'M12 3c-3 0-5 2-5 5 0 1 .4 2 .9 2.8L4 17l2 1 1.5-3.5L9 16l2 1 1-6c.4-.2.7-.3.9-.3' },
      { to: '/items', label: 'Items', icon: 'M12 3l8 4-8 4-8-4 8-4z M4 11l8 4 8-4 M4 15l8 4 8-4' },
      { to: '/users', label: 'Users', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 20a8 8 0 0116 0' },
    ],
  },
  {
    label: 'Procurement',
    links: [
      { to: '/requirements', label: 'Requirements', icon: 'M4 4h16v12H8l-4 4V4z' },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: 'M12 3v18 M3 12h18 M12 3l9 9-9 9-9-9 9-9' },
      { to: '/deliveries', label: 'Deliveries', icon: 'M3 7h11v10H3z M14 10h4l3 3v4h-7z' },
      { to: '/discrepancies', label: 'Discrepancies', icon: 'M12 9v4 M12 17h.01 M12 3a9 9 0 100 18 9 9 0 000-18z' },
    ],
  },
  {
    label: 'Audit',
    links: [{ to: '/audit-logs', label: 'Audit Logs', icon: 'M9 12h6 M9 16h6 M9 8h6 M4 3h16v18l-4-3-4 3-4-3-4 3V3z' }],
  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-slate-900">
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            GRS
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">IPS Purchase Manager</p>
            <p className="text-xs text-slate-400">v1.0.0</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
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
        </nav>

        <div className="border-t border-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 12H3m0 0l4-4m-4 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 4h10a2 2 0 012 2v12a2 2 0 01-2 2H8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1 px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
