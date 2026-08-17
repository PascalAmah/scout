import type { ResumeContent } from '../api'
import { diffWords, type DiffSegment } from './wordDiff'

function DiffText({ segments }: { segments: DiffSegment[] }) {
  return (
    <p className="break-words text-[13px] leading-[1.7] text-charcoal">
      {segments.map((seg, index) => {
        const el =
          seg.type === 'del' ? (
            <del
              className="rounded-[3px] bg-brick-tint px-[3px] py-px text-brick [text-decoration-color:var(--color-brick)]"
            >
              {seg.text}
            </del>
          ) : seg.type === 'ins' ? (
            <ins
              className="rounded-[3px] bg-emerald-tint px-[3px] py-px font-semibold text-emerald-dark no-underline"
            >
              {seg.text}
            </ins>
          ) : (
            <span>{seg.text}</span>
          )
        return (
          <span key={index}>
            {index > 0 ? ' ' : null}
            {el}
          </span>
        )
      })}
    </p>
  )
}

function DiffBlock({
  label,
  segments,
}: {
  label: string
  segments: DiffSegment[] | null
}) {
  return (
    <div className="mb-2.5 rounded-md border border-line bg-paper px-4.5 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-muted-2">{label}</span>
        <span className="rounded-[5px] bg-emerald-tint px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.4px] text-emerald-dark">
          AI-generated
        </span>
      </div>
      {segments ? (
        <DiffText segments={segments} />
      ) : (
        <p className="text-[13px] leading-[1.7] text-charcoal">—</p>
      )}
    </div>
  )
}

/**
 * Diff blocks for one version (mockup `.diff-block`): summary reword, per-
 * experience-entry bullet rewords, and skills reorder. Grounded in the real
 * base + version content — no invented prose.
 */
export function DiffView({
  base,
  version,
}: {
  base: ResumeContent
  version: ResumeContent
}) {
  const blocks: { label: string; segments: DiffSegment[] | null }[] = []

  const baseSummary = base.summary ?? ''
  const versionSummary = version.summary ?? ''
  if (versionSummary && versionSummary !== baseSummary) {
    blocks.push({ label: 'Summary — rewritten for this role', segments: diffWords(baseSummary, versionSummary) })
  }

  const baseExp = base.experience ?? []
  const versionExp = version.experience ?? []
  versionExp.forEach((exp, index) => {
    const baseBullets = baseExp[index]?.bullets ?? []
    const versionBullets = exp.bullets ?? []
    const baseJoined = baseBullets.join(' ')
    const versionJoined = versionBullets.join(' ')
    if (versionBullets.length > 0 && versionJoined !== baseJoined) {
      const title = exp.title ? ` ${exp.title}` : ''
      blocks.push({
        label: `Experience${title} — reworded for this role`,
        segments: diffWords(baseJoined, versionJoined),
      })
    }
  })

  const baseSkills = base.skills ?? []
  const versionSkills = version.skills ?? []
  if (versionSkills.length > 0 && baseSkills.join(',') !== versionSkills.join(',')) {
    blocks.push({
      label: 'Skills — reordered to lead with this role',
      segments: diffWords(baseSkills.join(', '), versionSkills.join(', ')),
    })
  }

  if (blocks.length === 0) return null
  return <div>{blocks.map((b, index) => <DiffBlock key={index} {...b} />)}</div>
}
