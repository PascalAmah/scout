import { type ReactNode } from 'react'

export function AuthField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[12.5px] font-semibold text-charcoal">
        {label}
        {hint ? <span className="ml-1.5 font-normal text-muted-2">{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brick">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-[13px] w-[13px] shrink-0 stroke-brick" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  )
}
