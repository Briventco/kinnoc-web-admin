import { useState } from 'react';
import { CalendarDays, LayoutDashboard, LogOut, Menu, PlusCircle, Settings, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/events/new', label: 'Create Event', icon: PlusCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** "Events" stays highlighted on event pages, but not on "Create Event". */
function isActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/';
  if (to === '/events') return pathname.startsWith('/events') && pathname !== '/events/new';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  return (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main">
      <div className="mb-4 px-3 py-2 text-lg font-semibold text-slate-900">
        Kinnoc <span className="text-indigo-600">Admin</span>
      </div>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
            isActive(to, pathname) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
          aria-current={isActive(to, pathname) ? 'page' : undefined}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        <LogOut className="size-4" aria-hidden />
        Sign Out
      </button>
    </nav>
  );
}

/** Sidebar (a drawer on small screens), top bar and the page content. */
export function AdminLayout() {
  const { admin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute top-3 right-3 rounded-md p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto truncate text-sm text-slate-600">
            {admin?.displayName ?? admin?.email ?? 'Administrator'}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
