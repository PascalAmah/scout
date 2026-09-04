import { type ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

/**
 * Scout button hierarchy (design system §05):
 * primary — charcoal, the default action
 * accent — emerald, reserved for the single most important action on a screen
 * secondary — white with border
 * ghost — transparent, low-priority / toolbar
 * destructive — white with brick treatment
 * All buttons are pill-shaped (--radius-pill).
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-charcoal text-white hover:bg-near-black',
  accent: 'bg-emerald text-white hover:bg-emerald-dark',
  secondary: 'border border-line-strong bg-white text-charcoal hover:border-charcoal',
  ghost: 'bg-transparent text-charcoal hover:bg-paper',
  destructive: 'border border-brick-tint bg-white text-brick hover:bg-brick-tint',
}

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-pill px-[22px] py-[11px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <button className={`${base} ${VARIANTS[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  )
}
