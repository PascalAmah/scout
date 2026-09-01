import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { useExtensionInstalled } from '../../shell/hooks'
import { tokens } from '../../../lib/auth'
import { pushSessionToExtension } from '../../../lib/extension-auth'
import { SettingsPanel } from '../components/SettingsPanel'

type TierTone = 'emerald' | 'amber' | 'slate'

const TIER_PILL: Record<TierTone, string> = {
  emerald: 'bg-emerald-tint text-emerald-dark',
  amber: 'bg-amber-tint text-amber',
  slate: 'bg-slate-tint text-slate',
}

const SOURCES: Array<{ name: string; mark: string; tier: string; tone: TierTone }> = [
  { name: 'Y Combinator', mark: 'YC', tier: 'API', tone: 'emerald' },
  { name: 'Wellfound', mark: 'WF', tier: 'Crawl', tone: 'amber' },
  { name: 'Product Hunt', mark: 'PH', tier: 'API', tone: 'emerald' },
  { name: 'Careers pages', mark: 'globe', tier: 'Crawl', tone: 'amber' },
  { name: 'LinkedIn', mark: 'in', tier: 'Extension only', tone: 'slate' },
]

export function IntegrationsPage() {
  const extensionInstalled = useExtensionInstalled()
  const [synced, setSynced] = useState(false)

  const rePair = () => {
    const access = tokens.access
    const refresh = tokens.refresh
    if (!access || !refresh) return
    pushSessionToExtension(access, refresh)
    setSynced(true)
    window.setTimeout(() => setSynced(false), 2500)
  }

  return (
    <div className="space-y-5">
      <SettingsPanel
        title="Browser extension"
        description="Saves startups directly to this account"
      >
        <div className="flex flex-wrap items-center gap-[14px]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-emerald-tint">
            {extensionInstalled ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                className="h-[21px] w-[21px] stroke-emerald-dark"
                aria-hidden
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                className="h-[21px] w-[21px] stroke-emerald-dark"
                aria-hidden
              >
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <b className="mb-0.5 block text-sm text-charcoal">
              {extensionInstalled ? 'Connected — Chrome' : 'Not installed'}
            </b>
            <span className="text-xs text-muted">
              {extensionInstalled
                ? 'Detected in this browser. Saves from YC, Wellfound, and careers pages land in your Workspace.'
                : 'Install the Scout extension to save startups as you browse.'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {synced ? (
              <span className="text-xs font-semibold text-emerald-dark">
                Session synced
              </span>
            ) : null}
            <Button
              variant="secondary"
              onClick={rePair}
              disabled={!extensionInstalled}
            >
              {extensionInstalled ? 'Re-pair' : 'Install'}
            </Button>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Data sources"
        description="How each source is captured — matches the tiers used across enrichment"
      >
        <div className="mt-1 flex flex-wrap gap-2.5">
          {SOURCES.map((source) => (
            <div
              key={source.name}
              className="flex items-center gap-2 rounded-md border border-line bg-paper px-[13px] py-[9px]"
            >
              {source.mark === 'globe' ? (
                <div className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-charcoal">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    className="h-[10px] w-[10px] stroke-white"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
                  </svg>
                </div>
              ) : (
                <span className="flex h-[18px] w-[22px] items-center justify-center rounded-[5px] bg-charcoal text-[9px] font-bold text-white">
                  {source.mark}
                </span>
              )}
              <span className="text-xs font-semibold text-charcoal">
                {source.name}
              </span>
              <span
                className={`rounded-pill px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.3px] ${TIER_PILL[source.tone]}`}
              >
                {source.tier}
              </span>
            </div>
          ))}
        </div>
      </SettingsPanel>
    </div>
  )
}