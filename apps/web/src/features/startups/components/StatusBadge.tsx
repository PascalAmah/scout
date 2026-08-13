import { Badge } from '../../../components/ui/Badge'
import type { EnrichmentStatus } from '../api'

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
  unknown: 'Unknown',
}

const HIRING_TONES: Record<string, 'green' | 'amber' | 'gray'> = {
  hiring: 'green',
  maybe: 'amber',
  not_hiring: 'gray',
  unknown: 'gray',
}

const ENRICHMENT_TONES: Record<EnrichmentStatus, 'gray' | 'amber' | 'green' | 'red'> = {
  none: 'gray',
  queued: 'amber',
  running: 'amber',
  succeeded: 'green',
  failed: 'red',
}

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <Badge tone="gray">Unknown stage</Badge>
  return <Badge tone="blue">{STAGE_LABELS[stage] ?? stage.replaceAll('_', ' ')}</Badge>
}

export function HiringBadge({ hiringStatus }: { hiringStatus: string | null }) {
  const label = (hiringStatus ?? 'unknown').replaceAll('_', ' ')
  return <Badge tone={HIRING_TONES[hiringStatus ?? 'unknown']}>{label}</Badge>
}

export function EnrichmentBadge({ status }: { status: EnrichmentStatus }) {
  return <Badge tone={ENRICHMENT_TONES[status]}>{status}</Badge>
}

export function WorkspaceStatusBadge({ status }: { status: string }) {
  if (status === 'archived') return <Badge tone="gray">Archived</Badge>
  if (status === 'interested') return <Badge tone="blue">Interested</Badge>
  return <Badge tone="green">Saved</Badge>
}
