import { type ReactNode } from 'react'

/**
 * Settings panel (mockup: docs/mockups/scout_settings.html §.panel).
 * White surface, 1px line border, 16px radius, small shadow; header carries
 * the panel title + muted description, with a brick-tint "danger" variant.
 * Structure follows the Scout design system — hierarchy from line + spacing,
 * not heavy shadows.
 */
export function SettingsPanel({
  title,
  description,
  danger = false,
  className = '',
  children,
}: {
  title: string
  description?: string
  danger?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border bg-white shadow-sm ${
        danger ? 'border-brick-tint' : 'border-line'
      } ${className}`}
    >
      <header
        className={`border-b px-[22px] py-[18px] ${
          danger ? 'border-[#EBC7BC] bg-brick-tint' : 'border-line'
        }`}
      >
        <h2
          className={`text-[15px] font-semibold ${
            danger ? 'text-brick' : 'text-charcoal'
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </header>
      <div className="px-[22px] py-[22px]">{children}</div>
    </section>
  )
}
