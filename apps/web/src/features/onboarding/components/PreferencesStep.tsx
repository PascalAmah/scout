import { useState, type FormEvent } from 'react'

export function PreferencesStep({
  remote,
  onRemoteChange,
  locations,
  onAddLocation,
  onRemoveLocation,
}: {
  remote: boolean
  onRemoteChange: (value: boolean) => void
  locations: string[]
  onAddLocation: (location: string) => void
  onRemoveLocation: (location: string) => void
}) {
  const [draft, setDraft] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = draft.trim()
    if (value && !locations.includes(value)) onAddLocation(value)
    setDraft('')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-charcoal">Work preferences</p>
        <button
          type="button"
          role="switch"
          aria-checked={remote}
          onClick={() => onRemoteChange(!remote)}
          className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-line-strong bg-white px-4 py-3.5 text-left transition-colors hover:border-charcoal"
        >
          <span>
            <span className="block text-sm font-medium text-charcoal">Open to remote</span>
            <span className="block text-xs text-muted">Matches remote-friendly startups first</span>
          </span>
          <span
            aria-hidden
            className={`relative h-[22px] w-[38px] shrink-0 rounded-pill transition-colors ${
              remote ? 'bg-emerald' : 'bg-line-strong'
            }`}
          >
            <span
              className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                remote ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </span>
        </button>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-charcoal">Preferred locations</p>
        {locations.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {locations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1.5 rounded-pill border border-emerald bg-emerald-tint px-3 py-1.5 text-[13px] font-medium text-emerald-dark"
              >
                {loc}
                <button
                  type="button"
                  onClick={() => onRemoveLocation(loc)}
                  aria-label={`Remove ${loc}`}
                  className="text-emerald-dark/70 hover:text-brick"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="h-3 w-3 stroke-current" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. San Francisco, London, NYC"
            aria-label="Add a location"
            className="w-full rounded-sm border border-line-strong bg-white px-3.5 py-[11px] text-sm text-charcoal placeholder:text-muted-2 focus:border-emerald focus:outline-2 focus:outline-emerald focus:outline-offset-1"
          />
          <button
            type="submit"
            className="shrink-0 rounded-pill border border-line-strong bg-white px-4 text-sm font-semibold text-charcoal transition-colors hover:border-charcoal"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
