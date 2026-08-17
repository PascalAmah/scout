import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { generateResumeRequest, selectBaseResume } from '../../resume-studio/api'
import { useJobStatus, useResumes } from '../../resume-studio/hooks'
import type { MatchOut } from '../api'

interface GenState {
  started: number
  done: number
  failed: number
}

/** Polls one enrichment job and reports terminal status back to the bar. */
function BulkJobTracker({
  jobId,
  onSettled,
}: {
  jobId: string
  onSettled: (ok: boolean) => void
}) {
  const query = useJobStatus(jobId, true)
  const reported = useRef(false)
  useEffect(() => {
    if (reported.current) return
    if (query.data?.status === 'succeeded') {
      reported.current = true
      onSettled(true)
    } else if (query.data?.status === 'failed') {
      reported.current = true
      onSettled(false)
    }
  }, [query.data?.status, onSettled])
  return null
}

/**
 * Sticky bulk bar (mockup `.bulk-bar`): shows when matches are selected.
 * "Generate resumes for selected" fires one generation per selected job
 * against the user's base resume and reports progress as jobs settle.
 */
export function BulkBar({
  selected,
  onClear,
}: {
  selected: MatchOut[]
  onClear: () => void
}) {
  const resumesQuery = useResumes()
  const resume = selectBaseResume(resumesQuery.data ?? [])
  const navigate = useNavigate()

  const [gen, setGen] = useState<GenState | null>(null)
  const [enrichmentJobIds, setEnrichmentJobIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  async function start() {
    if (!resume?.id) {
      void navigate({ to: '/resume-studio' })
      return
    }
    setError(null)
    const jobs = selected.map((m) => m.job_id)
    setGen({ started: 0, done: 0, failed: 0 })
    setEnrichmentJobIds([])
    const ids: string[] = []
    await Promise.all(
      jobs.map(async (jobId) => {
        try {
          const accepted = await generateResumeRequest(resume.id, {
            job_id: jobId,
            application_id: null,
          })
          ids.push(accepted.job_id)
          setGen((prev) => (prev ? { ...prev, started: prev.started + 1 } : prev))
        } catch (err) {
          setGen((prev) =>
            prev ? { ...prev, started: prev.started + 1, failed: prev.failed + 1 } : prev,
          )
          setError(err instanceof Error ? err.message : 'Some generations failed.')
        }
      }),
    )
    setEnrichmentJobIds(ids)
  }

  if (selected.length === 0) return null

  const allDone = gen !== null && gen.started > 0 && gen.done + gen.failed >= gen.started

  return (
    <div className="sticky top-[70px] z-20 mb-4 flex items-center gap-3.5 rounded-md bg-charcoal px-4.5 py-3 text-white shadow-md">
      <span className="text-[13px] font-semibold">{selected.length} selected</span>
      <div className="h-4 w-px bg-[#3A4452]" />
      {gen === null ? (
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-pill bg-emerald px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate resumes for selected
        </button>
      ) : (
        <span className="text-[12.5px] font-semibold text-[#9AA6B2]">
          {allDone ? (
            <>
              {gen.done} generated{gen.failed > 0 ? `, ${gen.failed} failed` : ''} —{' '}
              <Link to="/resume-studio" className="text-white underline">
                view in Resume Studio
              </Link>
            </>
          ) : (
            `Generating ${gen.done + gen.failed} of ${gen.started}…`
          )}
        </span>
      )}
      {error ? <span className="text-[12px] text-[#F2B8A5]">{error}</span> : null}
      <button
        type="button"
        onClick={() => {
          onClear()
          setGen(null)
          setEnrichmentJobIds([])
          setError(null)
        }}
        className="ml-auto rounded-pill bg-transparent px-2 py-1 text-[12.5px] font-semibold text-[#9AA6B2] hover:text-white"
      >
        Clear selection
      </button>

      {enrichmentJobIds.map((jobId) => (
        <BulkJobTracker
          key={jobId}
          jobId={jobId}
          onSettled={(ok) => {
            setGen((prev) =>
              prev
                ? {
                    ...prev,
                    done: prev.done + (ok ? 1 : 0),
                    failed: prev.failed + (ok ? 0 : 1),
                  }
                : prev,
            )
          }}
        />
      ))}
    </div>
  )
}
