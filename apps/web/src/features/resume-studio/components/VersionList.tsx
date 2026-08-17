import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '../../../components/ui/Button'
import { ApiRequestError } from '../../../lib/api-client'
import type { ApplicationOption } from '../api'
import { downloadVersionPdf } from '../api'
import { useJobStatus, useReviewVersion, useVersions } from '../hooks'
import type { ResumeOut } from '../api'
import { DiffView } from './DiffView'

function initialsOf(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function timeAgo(date: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days}d ago`
}

/** Plain-text rendering of a version for "Copy as text" — client-side only. */
function versionToText(content: ResumeOut['content']): string {
  if (!content) return ''
  const parts: string[] = []
  if (content.summary) parts.push(content.summary)
  for (const exp of content.experience ?? []) {
    const head = [exp.title, exp.company].filter(Boolean).join(' @ ')
    if (head) parts.push(head)
    if (exp.dates) parts.push(exp.dates)
    parts.push(...(exp.bullets ?? []).map((b) => `• ${b}`))
  }
  if ((content.skills ?? []).length > 0) parts.push((content.skills ?? []).join(', '))
  return parts.join('\n')
}

function GeneratingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3.5 border-t border-line px-5 py-4">
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-muted-2 text-[11.5px] font-bold text-white">
        {initialsOf(label)}
      </div>
      <div className="min-w-0">
        <b className="block truncate text-[13.5px] text-charcoal">{label}</b>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          Generating… usually under a minute
        </div>
      </div>
      <span className="ml-auto shrink-0 rounded-pill bg-slate-tint px-2.5 py-1 text-[10.5px] font-bold text-slate">
        queued
      </span>
    </div>
  )
}

function VersionItem({
  version,
  label,
  baseContent,
  isNewest,
}: {
  version: NonNullable<ReturnType<typeof useVersions>['data']>[number]
  label: string
  baseContent: ResumeOut['content']
  isNewest: boolean
}) {
  const review = useReviewVersion()
  const [open, setOpen] = useState(isNewest)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReviewed = version.reviewed_at != null
  const versionContent = version.content ?? {}

  async function download() {
    setError(null)
    try {
      await downloadVersionPdf(version.id)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.code === 'NOT_REVIEWED' ? 'Review this version before downloading.' : err.message)
      } else {
        setError('Download failed.')
      }
    }
  }

  async function copyText() {
    const text = versionToText(versionContent)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left hover:bg-paper"
      >
        <div
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[11.5px] font-bold text-white ${
            isReviewed ? 'bg-emerald' : 'bg-charcoal'
          }`}
        >
          {initialsOf(label)}
        </div>
        <div className="min-w-0">
          <b className="block truncate text-[13.5px] text-charcoal">{label}</b>
          <div className="mt-0.5 text-[11.5px] text-muted">
            Generated {timeAgo(version.created_at)}
          </div>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-pill px-2.5 py-1 text-[10.5px] font-bold ${
            isReviewed ? 'bg-emerald-tint text-emerald-dark' : 'bg-amber-tint text-amber'
          }`}
        >
          {isReviewed ? 'Reviewed' : 'Needs review'}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          className={`h-3.5 w-3.5 shrink-0 stroke-muted-2 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="px-5 pb-5.5">
          <DiffView base={baseContent ?? {}} version={versionContent} />

          {!isReviewed ? (
            <div className="mt-3.5 flex items-center gap-2.5 rounded-md border border-[#F0DDB8] bg-amber-tint px-4 py-3 text-[12.5px] text-amber">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 shrink-0 stroke-amber" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              Download and send are locked until you mark this reviewed — grounding reduces
              fabrication risk, it doesn&apos;t eliminate it.
            </div>
          ) : null}

          {error ? <p className="mt-2 text-[12px] text-brick">{error}</p> : null}

          <div className="mt-3.5 flex flex-wrap gap-2">
            {!isReviewed ? (
              <Button
                className="px-3.5 py-1.5 text-[12.5px]"
                onClick={() => review.mutate(version.id)}
                loading={review.isPending}
              >
                Mark reviewed
              </Button>
            ) : null}
            <Button
              variant={isReviewed ? 'accent' : 'secondary'}
              className="px-3.5 py-1.5 text-[12.5px]"
              disabled={!isReviewed}
              onClick={() => void download()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
                <path d="M12 15V3M7 10l5 5 5-5M4 21h16" />
              </svg>
              Download PDF
            </Button>
            <Button
              variant="secondary"
              className="px-3.5 py-1.5 text-[12.5px]"
              disabled={!isReviewed}
              onClick={() => void copyText()}
            >
              {copied ? 'Copied' : 'Copy as text'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Right column (mockup `.version-list`): the "Generate a new version"
 * trigger lives above this in the page; here are the versions themselves.
 * A running enrichment job renders the pulsing "Generating…" row; completed
 * versions render as expandable items with diffs, the review gate, and
 * download/copy actions.
 */
export function VersionList({
  resume,
  runningJob,
  applications,
  onSettled,
}: {
  resume: ResumeOut
  runningJob: { jobId: string; label: string } | null
  applications: ApplicationOption[]
  onSettled: () => void
}) {
  const versionsQuery = useVersions(resume.id)
  const queryClient = useQueryClient()
  const jobStatus = useJobStatus(runningJob?.jobId ?? null, Boolean(runningJob))

  useEffect(() => {
    const status = jobStatus.data?.status
    if (status !== 'succeeded' && status !== 'failed') return
    void queryClient.invalidateQueries({ queryKey: ['resume-studio', 'versions', resume.id] })
    onSettled()
  }, [jobStatus.data?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const labelById = new Map(applications.map((a) => [a.id, a.label]))
  const versions = [...(versionsQuery.data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const labelOf = (version: NonNullable<ReturnType<typeof useVersions>['data']>[number]): string =>
    version.content?.role_label ??
    labelById.get(version.application_id ?? '') ??
    'General version'

  return (
    <div className="flex flex-col">
      {runningJob ? <GeneratingRow label={runningJob.label} /> : null}
      {versions.length === 0 && !runningJob ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted">
          No versions generated yet. Generate one above.
        </p>
      ) : null}
      {versions.map((version, index) => (
        <VersionItem
          key={version.id}
          version={version}
          label={labelOf(version)}
          baseContent={resume.content}
          isNewest={index === 0}
        />
      ))}
    </div>
  )
}
