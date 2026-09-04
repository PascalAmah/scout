import { Badge } from '../../../components/ui/Badge'

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
  unknown: 'Unknown',
}

const HIRING_TONES: Record<string, 'green' | 'amber' | 'neutral'> = {
  hiring: 'green',
  maybe: 'amber',
  not_hiring: 'neutral',
  unknown: 'neutral',
}

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <Badge tone="gray">Unknown stage</Badge>
  return <Badge tone="blue">{STAGE_LABELS[stage] ?? stage.replaceAll('_', ' ')}</Badge>
}

export function HiringBadge({ hiringStatus }: { hiringStatus: string | null }) {
  const value = hiringStatus ?? 'unknown'
  const label = value === 'unknown' ? 'Hiring: Unknown' : value.replaceAll('_', ' ')
  return <Badge tone={HIRING_TONES[value]}>{label}</Badge>
}

export function WorkspaceStatusBadge({ status }: { status: string }) {
  if (status === 'archived') return <Badge tone="gray">Archived</Badge>
  if (status === 'interested') return <Badge tone="amber">Interested</Badge>
  return <Badge tone="neutral">Saved</Badge>
}
