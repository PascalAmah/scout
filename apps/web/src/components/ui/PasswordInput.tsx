import { useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Show the brick/destructive border (used with an inline validation error). */
  invalid?: boolean
}

/**
 * Mobile toggle icon: "eye" (show); a slash overlay renders when the value is
 * currently visible (toggle back to hidden).
 */
export function EyeIcon({ open, className = '' }: { open?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {open ? <path d="M4 4l16 16" /> : null}
    </svg>
  )
}

/**
 * Scout password control (design system §06): same look as `Input`, with a
 * reveal/hide toggle on the right. The field is always `password`/`text`
 * derived from the local `visible` state.
 */
export function PasswordInput({ className = '', invalid = false, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        className={`w-full rounded-sm border bg-white px-3.5 py-[11px] pr-9 text-sm text-charcoal placeholder:text-muted-2 focus:outline-2 focus:outline-offset-1 ${
          invalid
            ? 'border-brick focus:border-brick focus:outline-brick'
            : 'border-line-strong focus:border-emerald focus:outline-emerald'
        }`}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-muted-2 transition-colors hover:text-charcoal focus:outline-2 focus:outline-emerald focus:outline-offset-1"
      >
        <EyeIcon open={visible} className="h-[17px] w-[17px]" />
      </button>
    </div>
  )
}
