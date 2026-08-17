const ROLES = [
  'Software Engineer',
  'Frontend',
  'Backend',
  'Full-stack',
  'ML / AI',
  'Data',
  'DevOps',
  'Product',
  'Design',
  'Marketing',
  'Other',
]

export function RolesStep({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (role: string) => void
}) {
  return (
    <div>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        Pick the roles you're targeting. Scout uses these to prioritize matches — you can
        change them anytime in Settings.
      </p>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => {
          const active = selected.includes(role)
          return (
            <button
              key={role}
              type="button"
              onClick={() => onToggle(role)}
              aria-pressed={active}
              className={`rounded-pill border px-[15px] py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-emerald bg-emerald-tint text-emerald-dark'
                  : 'border-line-strong bg-white text-charcoal hover:border-charcoal'
              }`}
            >
              {role}
            </button>
          )
        })}
      </div>
    </div>
  )
}
