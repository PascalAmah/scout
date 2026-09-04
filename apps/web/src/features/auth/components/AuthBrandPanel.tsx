import { type ReactNode } from 'react'

import { LensMark } from '../../../components/ui/LensMark'

/**
 * Near-black auth brand panel. Fills the viewport height (never scrolls);
 * the mid content is the flexible section — it absorbs/clips when the
 * viewport is short so the panel adapts instead of overflowing.
 */
export function AuthBrandPanel({ children, foot }: { children: ReactNode; foot: string }) {
  return (
    <div className="relative hidden min-h-0 min-[900px]:flex flex-col justify-between overflow-hidden bg-near-black px-14 py-10 text-white">
      <div className="pointer-events-none absolute -right-[100px] -top-[160px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(24,160,88,0.16)_0%,rgba(24,160,88,0)_68%)]" />
      <div className="relative z-10">
        <LensMark size={24} />
      </div>
      <div className="relative z-10 min-h-0 max-w-[400px] flex-1 overflow-hidden py-6">{children}</div>
      <div className="relative z-10 text-xs text-[#6B7688]">{foot}</div>
    </div>
  )
}
