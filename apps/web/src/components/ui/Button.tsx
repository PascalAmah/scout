import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base = 'rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-[#1F2937] text-white hover:bg-[#0B0F14]'
      : 'border border-[#D6D3C9] text-[#1F2937] hover:border-[#1F2937]'
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled || loading} {...props}>
      {children}
    </button>
  )
}