import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058] ${className}`}
      {...props}
    />
  )
}