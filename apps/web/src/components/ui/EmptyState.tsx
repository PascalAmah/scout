import { type ReactNode } from 'react'

/**
 * Scout empty state (design system §11): dashed line-strong border, white
 * surface, Fraunces headline — reserved for empty-state headlines per the
 * type system.
 */
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-white px-6 py-16 text-center">
      {icon ? <div className="mb-3 text-muted-2">{icon}</div> : null}
      <h3 className="font-serif text-lg font-semibold text-charcoal">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
