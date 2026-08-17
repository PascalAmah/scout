import { type ReactNode } from 'react'

import { LensMark } from '../../../components/ui/LensMark'

export function AuthFormShell({
  title,
  lede,
  children,
  footer,
}: {
  title: string
  lede: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-10 flex items-center gap-2.5">
        <LensMark size={26} />
        <span className="font-serif text-[19px] font-semibold text-charcoal">Scout</span>
      </div>
      <h1 className="font-serif text-[30px] font-semibold tracking-[-0.5px] text-charcoal">{title}</h1>
      <p className="mb-8 mt-2 text-sm text-muted">{lede}</p>
      {children}
      <p className="mt-6 text-center text-[13.5px] text-muted">{footer}</p>
    </div>
  )
}
