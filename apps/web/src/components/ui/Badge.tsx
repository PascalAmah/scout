import { type ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'gray'

/**
 * Scout status badges (design system §07). Tones map to the semantic status
 * palette: emerald (interview/offer/hiring), amber (interested/pending),
 * slate (applied/informational), brick (rejected/failed), neutral gray
 * (saved/archived). The dot inherits the badge's text color so the offer
 * badge (emerald fill, white text) gets a white dot automatically.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[#F0EFEA] text-[#5B5F66]',
  green: 'bg-emerald-tint text-emerald-dark',
  amber: 'bg-amber-tint text-amber',
  red: 'bg-brick-tint text-brick',
  blue: 'bg-slate-tint text-slate',
  gray: 'bg-[#F0EFEC] text-muted-2',
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-[11px] py-[5px] text-[12.5px] font-semibold ${TONES[tone]} ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
