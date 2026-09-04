const STEPS = ['Roles', 'Resume', 'Preferences']

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-0" aria-label="Setup progress">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex items-center">
            {i > 0 ? (
              <span
                aria-hidden
                className={`mx-1.5 h-px w-5 ${done || active ? 'bg-emerald' : 'bg-line-strong'}`}
              />
            ) : null}
            <span className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? 'bg-emerald text-white'
                    : active
                      ? 'bg-emerald-tint text-emerald-dark ring-1 ring-emerald'
                      : 'bg-paper text-muted-2 ring-1 ring-line-strong'
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" className="h-3 w-3 stroke-white" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  active ? 'text-charcoal' : done ? 'text-emerald-dark' : 'text-muted-2'
                }`}
              >
                {label}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
