import { type ReactNode } from 'react'

/**
 * Desktop (≥900px): a viewport-height split — the form column scrolls
 * internally when its content is tall; the brand column never scrolls.
 * Below 900px the brand is hidden and the form flows with the page.
 */
export function AuthSplit({ form, brand }: { form: ReactNode; brand: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 min-[900px]:h-screen min-[900px]:grid-cols-2 min-[900px]:overflow-hidden">
      <div className="thin-scrollbar flex min-h-0 min-[900px]:h-full min-[900px]:overflow-y-auto px-10 py-12">
        {/* m-auto centers on both axes when there's room and scrolls from the
            top without clipping when the form overflows. */}
        <div className="m-auto w-full max-w-[400px]">{form}</div>
      </div>
      {brand}
    </div>
  )
}
