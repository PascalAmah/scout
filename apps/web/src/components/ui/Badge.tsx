import { type ReactNode } from 'react'

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'gray'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[#F3F1EA] text-[#6B7280] border-[#E5E3DC]',
  green: 'bg-[#E9F7F0] text-[#0E7A45] border-[#BFE6D1]',
  amber: 'bg-[#FDF6E7] text-[#92600A] border-[#F0DFB0]',
  red: 'bg-[#FDECEC] text-[#B3261E] border-[#F3C9C5]',
  blue: 'bg-[#EAF2FD] text-[#1D4ED8] border-[#C9DDFA]',
  gray: 'bg-[#EDEEF0] text-[#4B5563] border-[#D6D8DB]',
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
