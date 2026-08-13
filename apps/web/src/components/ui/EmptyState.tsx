import { type ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D6D3C9] bg-white px-6 py-16 text-center">
      {icon ? <div className="mb-3 text-[#9AA1AB]">{icon}</div> : null}
      <h3 className="font-serif text-lg font-semibold text-[#1F2937]">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-[#6B7280]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}