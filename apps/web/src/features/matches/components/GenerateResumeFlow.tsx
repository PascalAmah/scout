import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { useGenerateResume, useJobStatus, useResumes } from '../../resume-studio/hooks'
import { selectBaseResume } from '../../resume-studio/api'

const KEY = 'scout_resume_generated_jobs'

function readGenerated(): Set<string> {
  try {
    const raw = sessionStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function persistGenerated(jobId: string): void {
  const set = readGenerated()
  set.add(jobId)
  sessionStorage.setItem(KEY, JSON.stringify([...set]))
}

/**
 * "Generate resume" for one match (mockup `.mr-actions`). Requires the user's
 * base resume (Resume Studio auto-creates one); without it the button routes
 * to Resume Studio. With it, generation runs through the real endpoint and
 * the job status is polled until it succeeds or fails. Once a job has a
 * version, the button stays "View in Resume Studio" across navigation (job
 * ids are remembered in sessionStorage — local UI state only).
 */
export function GenerateResumeFlow({ jobId }: { jobId: string }) {
  const resumesQuery = useResumes()
  const resume = selectBaseResume(resumesQuery.data ?? [])

  // Lift the mutation into a component-level state so we can start it on click
  // (useGenerateResume needs a resumeId, which we resolve lazily).
  const generate = useGenerateResume(resume?.id ?? '')

  const [started, setStarted] = useState(() => readGenerated().has(jobId))
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)

  const jobStatusQuery = useJobStatus(
    started && !stale ? (generate.data?.job_id ?? null) : null,
    started && generate.isSuccess && !stale,
  )

  const jobStatus = jobStatusQuery.data?.status
  const jobDone = jobStatus === 'succeeded'
  const jobFailed = jobStatus === 'failed'

  // Only claim success when the generation job actually finishes. The generate
  // endpoint returns 202 (accepted) the instant the task is queued — that is
  // not proof a version exists, so it must never flip this button to success.
  useEffect(() => {
    if (jobDone) persistGenerated(jobId)
  }, [jobDone, jobId])

  // Surface the worker's stored error instead of silently resetting to a
  // plain "Generate resume" button — the user needs to know why nothing was
  // produced and that they can retry.
  useEffect(() => {
    if (jobFailed && jobStatusQuery.data?.error) {
      setError(jobStatusQuery.data.error)
    }
  }, [jobFailed, jobStatusQuery.data?.error])

  const running =
    generate.isPending ||
    jobStatus === 'running' ||
    jobStatus === 'queued'
  // Once the job has sat queued long enough to look stale we stop polling
  // (otherwise a stuck job polls forever and trips the API rate limiter) and
  // keep the button disabled behind an explainer pill.
  const waiting = running || stale
  const succeeded = started && (jobDone || readGenerated().has(jobId))

  const unresolved = started && !jobDone && !jobFailed && !stale
  // Generation is fully async — the API only enqueues; the Celery worker turns
  // the queued job into a version. If nothing is consuming the generation queue
  // the job sits at "queued" forever, so after 30s tell the user it's likely an
  // infra problem rather than leaving them watching a spinner.
  useEffect(() => {
    if (!unresolved) {
      setStale(false)
      return
    }
    const timer = setTimeout(() => setStale(true), 30_000)
    return () => clearTimeout(timer)
  }, [unresolved, generate.data?.job_id])

  if (!resume || !resume.id) {
    return (
      <Link
        to="/resume-studio"
        className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-emerald px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-dark"
      >
        Generate resume
      </Link>
    )
  }

  if (succeeded) {
    return (
      <Link
        to="/resume-studio"
        className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-emerald px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-dark"
      >
        View in Resume Studio
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error ? (
        <span className="max-w-[200px] text-right text-[11px] leading-tight text-brick">
          {error}
        </span>
      ) : null}
      {stale ? (
        <span
          title="Generation runs on the background worker. If it stays queued, make sure the Celery worker is running."
          className="whitespace-nowrap rounded-pill border border-[#F0DDB8] bg-amber-tint px-2 py-0.5 text-[10px] font-semibold text-amber"
        >
          Still queued
        </span>
      ) : null}
      <button
        type="button"
        disabled={waiting}
        onClick={() => {
          setError(null)
          setStarted(true)
          generate.mutate(
            { job_id: jobId, application_id: null },
            {
              onError: (err) => {
                setError(err instanceof Error ? err.message : 'Generation failed.')
              },
            },
          )
        }}
        className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-emerald px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {waiting ? (
          <>
            <span
              aria-hidden
              className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            Generating…
          </>
        ) : (
          'Generate resume'
        )}
      </button>
    </div>
  )
}
