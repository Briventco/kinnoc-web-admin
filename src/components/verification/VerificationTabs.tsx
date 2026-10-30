import { NavLink } from 'react-router';

const TABS = [
  { to: '/verification', label: 'Overview', end: true },
  { to: '/verification/applications', label: 'Applications', end: false },
  { to: '/verification/verified', label: 'Verified users', end: false },
  { to: '/verification/grant', label: 'Grant verification', end: false },
];

/** Sub-navigation for the Verification section. Scrolls sideways on narrow screens. */
export function VerificationTabs() {
  return (
    <nav aria-label="Verification" className="-mx-4 mb-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap ${
                isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
