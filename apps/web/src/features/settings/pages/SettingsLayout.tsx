import { Link, Outlet } from '@tanstack/react-router'

const TABS = [
  { label: 'Profile / CV', to: '/settings/profile' },
  { label: 'Account', to: '/settings/account' },
  { label: 'Integrations', to: '/settings/integrations' },
]

/**
 * Settings shell (mockup: docs/mockups/scout_settings.html).
 * Two-column grid: a sticky left settings nav (200px) driving which panel set
 * renders on the right. Active item is charcoal with white text; below 760px
 * the nav stacks above the panels.
 */
export function SettingsLayout() {
  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="page-head mb-4">
        <h1 className="font-serif text-[28px] font-semibold tracking-[-0.4px] text-charcoal">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Your profile, account security, and connected sources.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[200px_1fr]">
        <nav
          aria-label="Settings"
          className="flex flex-col gap-0.5 lg:sticky lg:top-6"
        >
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className="rounded-[9px] px-[14px] py-[10px] text-[13.5px] font-semibold text-muted transition-colors hover:bg-white hover:text-charcoal [&.active]:bg-charcoal [&.active]:text-white"
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}