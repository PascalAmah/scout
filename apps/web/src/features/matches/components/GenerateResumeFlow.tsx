import { useState } from 'react'
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

  const jobStatusQuery = useJobStatus(
    started ? (generate.data?.job_id ?? null) : null,
    started && generate.isSuccess,
  )

  const running =
    generate.isPending ||
    jobStatusQuery.data?.status === 'running' ||
    jobStatusQuery.data?.status === 'queued'
  const succeeded =
    started && (jobStatusQuery.data?.status === 'succeeded' || readGenerated().has(jobId))

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
      {error ? <span className="text-[11px] text-brick">{error}</span> : null}
      <button
        type="button"
        disabled={running}
        onClick={() => {
          setError(null)
          setStarted(true)
          generate.mutate(
            { job_id: jobId, application_id: null },
            {
              onSuccess: () => persistGenerated(jobId),
              onError: (err) => {
                setError(err instanceof Error ? err.message : 'Generation failed.')
              },
            },
          )
        }}
        className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-emerald px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-emerald-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? (
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
