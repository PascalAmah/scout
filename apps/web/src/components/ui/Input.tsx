import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * Scout form control (design system §06): 8px radius, 11px/14px padding,
 * line-strong border, emerald focus outline.
 */
export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-sm border border-line-strong bg-white px-3.5 py-[11px] text-sm text-charcoal placeholder:text-muted-2 focus:border-emerald focus:outline-2 focus:outline-emerald focus:outline-offset-1 ${className}`}
      {...props}
    />
  )
}
