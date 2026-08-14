import { Link, Outlet } from '@tanstack/react-router'

const TABS = [
  { label: 'Profile / CV', to: '/settings/profile' },
  { label: 'Account', to: '/settings/account' },
  { label: 'Integrations', to: '/settings/integrations' },
]

export function SettingsLayout() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Settings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Manage your CV, account, and integrations.
        </p>
      </div>
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-[#E5E3DC] pb-3">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F6F5F0] hover:text-[#1F2937] [&.active]:bg-[#1F2937] [&.active]:text-white"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}