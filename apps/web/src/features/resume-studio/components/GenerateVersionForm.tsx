import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { useApplicationOptions, useGenerateResume } from '../hooks'
import type { ResumeOut } from '../api'

const TONES = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'technical', label: 'Technical' },
]

/**
 * Collapsible "Generate a new version" trigger (mockup `.gen-trigger`):
 * pick an application, set tone + emphasis chips, and kick off generation.
 * Reports the enrichment job to the parent so the list can show the
 * "Generating…" row while the worker runs.
 */
export function GenerateVersionForm({
  resume,
  onRunning,
}: {
  resume: ResumeOut
  onRunning: (jobId: string, label: string) => void
}) {
  const applicationsQuery = useApplicationOptions()
  const generate = useGenerateResume(resume.id)

  const [open, setOpen] = useState(false)
  const [applicationId, setApplicationId] = useState('')
  const [tone, setTone] = useState('concise')
  const [emphasize, setEmphasize] = useState<Set<string>>(new Set())

  const applications = applicationsQuery.data ?? []
  const skills = resume.content?.skills ?? []
  const selectedApp = applications.find((a) => a.id === applicationId)

  function toggleEmphasis(skill: string) {
    setEmphasize((prev) => {
      const next = new Set(prev)
      if (next.has(skill)) next.delete(skill)
      else next.add(skill)
      return next
    })
  }

  function submit() {
    if (!applicationId) return
    generate.mutate(
      {
        application_id: applicationId,
        job_id: selectedApp?.job_id ?? null,
        tone,
        emphasize: [...emphasize],
      },
      {
        onSuccess: (accepted) => {
          onRunning(accepted.job_id, selectedApp?.label ?? 'New version')
          setApplicationId('')
          setEmphasize(new Set())
          setOpen(false)
        },
      },
    )
  }

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left hover:bg-paper"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          className="h-[18px] w-[18px] shrink-0 stroke-emerald"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <div>
          <b className="block text-[13.5px] text-charcoal">Generate a new version</b>
          <span className="block text-[11.5px] text-muted">Pick an application, set tone and emphasis</span>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          className={`ml-auto h-3.5 w-3.5 stroke-muted-2 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="border-t border-line px-5 pb-5 pt-4.5">
          {applications.length === 0 ? (
            <p className="rounded-md bg-paper p-3 text-[12.5px] text-muted">
              Create an application in the Pipeline first — generated resumes are tailored to a
              specific job.
            </p>
          ) : (
            <>
              <div className="mb-3.5 grid grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                    Application
                  </label>
                  <select
                    value={applicationId}
                    onChange={(e) => setApplicationId(e.target.value)}
                    className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] font-sans focus:outline-none focus:ring-2 focus:ring-emerald"
                  >
                    <option value="">Select an application…</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-semibold text-muted">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] font-sans focus:outline-none focus:ring-2 focus:ring-emerald"
                  >
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {skills.length > 0 ? (
                <>
                  <div className="mb-2.5">
                    <span className="text-[11.5px] font-semibold text-muted">Emphasize</span>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {skills.map((skill) => {
                      const on = emphasize.has(skill)
                      return (
                        <button
                          key={skill}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleEmphasis(skill)}
                          className={`rounded-pill border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                            on
                              ? 'border-emerald-tint-strong bg-emerald-tint text-emerald-dark'
                              : 'border-line-strong bg-white text-charcoal hover:border-charcoal'
                          }`}
                        >
                          {skill}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : null}

              <Button
                variant="accent"
                className="px-3.5 py-1.5 text-[12.5px]"
                disabled={!applicationId}
                loading={generate.isPending}
                onClick={submit}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
                </svg>
                Generate
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
