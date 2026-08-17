import { useEffect, useRef, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useCV } from '../../cv/hooks'
import { BaseResumePanel } from '../components/BaseResumePanel'
import { GenerateVersionForm } from '../components/GenerateVersionForm'
import { VersionList } from '../components/VersionList'
import { selectBaseResume, type ResumeContent } from '../api'
import type { CVProfile } from '../../cv/api'
import { useApplicationOptions, useCreateResume, useResumes, useUpdateResume } from '../hooks'

function defaultContentFromCv(cv: CVProfile | null): ResumeContent {
  const structured = cv?.structured_data
  const skills = structured?.skills ?? []
  const roles = structured?.roles ?? []
  const years = structured?.years_of_experience
  // Prefer the full parsed summary; fall back to a short role line only when
  // the CV parse didn't surface one.
  const fallbackSummary = roles.length
    ? `${roles[0]}${years != null ? ` with ${years} years of experience` : ''}.`
    : ''
  return {
    name: structured?.name?.trim() || undefined,
    summary: structured?.summary?.trim() || fallbackSummary,
    skills,
    experience: (structured?.experience ?? [])
      .map((exp) => ({
        company: exp.company ?? undefined,
        title: exp.title ?? undefined,
        dates: exp.dates ?? undefined,
        bullets: exp.bullets ?? [],
      }))
      .filter((exp) => exp.company || exp.title || exp.dates || (exp.bullets ?? []).length > 0),
    education: (structured?.education ?? []).map((label) => ({ degree: label })),
    projects: [],
  }
}

function isEmptyContent(content: ResumeContent | null | undefined): boolean {
  if (!content) return true
  return !content.summary && (content.skills ?? []).length === 0 && (content.experience ?? []).length === 0
}

/**
 * True when the base resume should be (re)seeded from CV structured data:
 * either it has no content at all, or it predates CV-parsed experience and
 * the CV now has entries to bring in.
 */
function needsSeeding(content: ResumeContent | null | undefined, cv: CVProfile | null): boolean {
  if (isEmptyContent(content)) return true
  const structured = cv?.structured_data
  if ((content?.experience ?? []).length === 0 && (structured?.experience ?? []).length > 0) {
    return true
  }
  // Upgrade path: resumes seeded before the parse included a name.
  if (!content?.name && structured?.name) return true
  return false
}

export function ResumeStudioIndexPage() {
  const resumesQuery = useResumes()
  const createResume = useCreateResume()
  const cvQuery = useCV()
  const applicationsQuery = useApplicationOptions()
  const [creating, setCreating] = useState(false)
  const [runningJob, setRunningJob] = useState<{ jobId: string; label: string } | null>(null)

  // Prefer the marked base resume; fall back to the newest row (legacy data
  // may predate is_base). Never show a random duplicate.
  const resumes = resumesQuery.data ?? []
  const resume = selectBaseResume(resumes)

  // StrictMode runs effects twice in dev; these refs make auto-creation and
  // backfill idempotent so we never create duplicate base resumes or re-fire
  // the seed PATCH.
  const autoCreateFired = useRef(false)
  const backfillFiredFor = useRef<string | null>(null)

  const updateResume = useUpdateResume(resume?.id ?? '')

  // Auto-create the base resume only once the CV query has settled, so the
  // seeded content comes from real CV structured data (skills, roles,
  // education) instead of an empty default.
  useEffect(() => {
    if (autoCreateFired.current) return
    if (!resumesQuery.isSuccess) return
    const cvSettled = cvQuery.isSuccess || cvQuery.isError
    if (!cvSettled) return
    if (resumes.length > 0 || creating) return
    autoCreateFired.current = true
    setCreating(true)
    const content = defaultContentFromCv(cvQuery.data ?? null)
    createResume.mutate({ title: 'My Base Resume', content }, { onSettled: () => setCreating(false) })
  }, [resumesQuery.isSuccess, cvQuery.isSuccess, cvQuery.isError, resumes.length, creating, createResume.mutate])

  // Backfill: a base resume created before the CV was uploaded (or before the
  // CV query settled) has empty content. Seed it from CV structured data once
  // (also upgrades resumes that predate CV-parsed experience). Guarded by a ref
  // keyed on the resume id — useMutation returns a fresh object on every
  // render, so depending on the mutation itself (or nothing) re-fires this
  // PATCH on each re-render and hammers the API until the rate limiter 429s it.
  useEffect(() => {
    if (!resume?.id || backfillFiredFor.current === resume.id) return
    const cv = cvQuery.data
    if (!cv?.structured_data) return
    if (!needsSeeding(resume.content, cv)) return
    if (resumesQuery.isLoading || cvQuery.isLoading) return
    const content = defaultContentFromCv(cv)
    if (isEmptyContent(content)) return
    backfillFiredFor.current = resume.id
    updateResume.mutate({ content })
  }, [resume?.id, resume?.content, cvQuery.data, cvQuery.isLoading, resumesQuery.isLoading, updateResume.mutate])

  if (resumesQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>
  }

  if (!resume) {
    return (
      <EmptyState
        title="No base resume yet"
        description="Start with an editable base resume — it's the source of truth that every generated version is tailored from."
        action={
          <Button
            onClick={() => {
              setCreating(true)
              createResume.mutate(
                { title: 'My Base Resume', content: defaultContentFromCv(cvQuery.data ?? null) },
                { onSettled: () => setCreating(false) },
              )
            }}
            loading={creating}
          >
            Create base resume
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-[28px] font-semibold tracking-tight text-charcoal">
          Resume Studio
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Your base resume stays untouched. Every generated version is a separate, tracked copy.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5.5 xl:grid-cols-[1fr_1.35fr]">
        <div className="xl:sticky xl:top-[88px]">
          <BaseResumePanel resume={resume} cv={cvQuery.data ?? null} />
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <GenerateVersionForm
            resume={resume}
            onRunning={(jobId, label) => setRunningJob({ jobId, label })}
          />
          <VersionList
            resume={resume}
            runningJob={runningJob}
            applications={applicationsQuery.data ?? []}
            onSettled={() => setRunningJob(null)}
          />
        </div>
      </div>
    </div>
  )
}
