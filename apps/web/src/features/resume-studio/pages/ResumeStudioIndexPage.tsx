import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Input } from '../../../components/ui/Input'
import { useCV } from '../../cv/hooks'
import type { ResumeContent, ResumeOut } from '../api'
import type { CVProfile } from '../../cv/api'
import {
  useApplicationOptions,
  useCreateResume,
  useGenerateResume,
  useJobStatus,
  useResumes,
  useUpdateResume,
  useVersions,
} from '../hooks'

function defaultContentFromCv(cv: CVProfile | null): ResumeContent {
  const skills = cv?.structured_data?.skills ?? []
  const roles = cv?.structured_data?.roles ?? []
  const years = cv?.structured_data?.years_of_experience
  const summary = roles.length
    ? `${roles[0]}${years != null ? ` with ${years} years of experience` : ''}.`
    : ''
  return { summary, skills, experience: [], education: [], projects: [] }
}

export function ResumeStudioIndexPage() {
  const resumesQuery = useResumes()
  const createResume = useCreateResume()
  const cvQuery = useCV()
  const [creating, setCreating] = useState(false)

  const resume: ResumeOut | null = resumesQuery.data?.[0] ?? null

  useEffect(() => {
    if (!resumesQuery.isSuccess || resumesQuery.data.length > 0 || creating) return
    setCreating(true)
    const content = defaultContentFromCv(cvQuery.data ?? null)
    createResume.mutate({ title: 'My Base Resume', content }, { onSettled: () => setCreating(false) })
  }, [resumesQuery, cvQuery.data, createResume, creating])

  if (resumesQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">Loading…</p>
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
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Resume Studio</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Edit your base resume, then generate tailored versions for specific applications. Every
          version is reviewed by you before it's used.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BaseResumeEditor resume={resume} />
        <VersionsPanel resumeId={resume.id} />
      </div>
    </div>
  )
}

function BaseResumeEditor({ resume }: { resume: ResumeOut }) {
  const updateResume = useUpdateResume(resume.id)
  const [title, setTitle] = useState(resume.title)
  const [summary, setSummary] = useState(resume.content?.summary ?? '')
  const [skills, setSkills] = useState((resume.content?.skills ?? []).join(', '))
  const [experience, setExperience] = useState(resume.content?.experience ?? [])

  useEffect(() => {
    setTitle(resume.title)
    setSummary(resume.content?.summary ?? '')
    setSkills((resume.content?.skills ?? []).join(', '))
    setExperience(resume.content?.experience ?? [])
  }, [resume])

  function save() {
    updateResume.mutate({
      title,
      content: {
        summary,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experience,
        education: resume.content?.education ?? [],
        projects: resume.content?.projects ?? [],
      },
    })
  }

  function updateExperience(index: number, patch: Partial<(typeof experience)[number]>) {
    setExperience((prev) => prev.map((exp, i) => (i === index ? { ...exp, ...patch } : exp)))
  }

  return (
    <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1F2937]">Base resume</h2>
        <span className="rounded-full bg-[#F6F5F0] px-2.5 py-0.5 text-[11px] font-medium text-[#6B7280]">
          source of truth
        </span>
      </div>

      <label className="mt-4 block text-xs font-medium text-[#6B7280]">Title</label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />

      <label className="mt-4 block text-xs font-medium text-[#6B7280]">Summary</label>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
      />

      <label className="mt-4 block text-xs font-medium text-[#6B7280]">Skills (comma separated)</label>
      <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="mt-1" />

      <div className="mt-4 flex items-center justify-between">
        <label className="text-xs font-medium text-[#6B7280]">Experience</label>
        <button
          type="button"
          onClick={() => setExperience((prev) => [...prev, { company: '', title: '', dates: '', bullets: [] }])}
          className="text-xs font-medium text-[#18A058] hover:underline"
        >
          + Add position
        </button>
      </div>
      {experience.map((exp, index) => (
        <div key={index} className="mt-3 rounded-lg border border-[#F0EEE7] p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Company"
              value={exp.company ?? ''}
              onChange={(e) => updateExperience(index, { company: e.target.value })}
            />
            <Input
              placeholder="Title"
              value={exp.title ?? ''}
              onChange={(e) => updateExperience(index, { title: e.target.value })}
            />
          </div>
          <Input
            placeholder="Dates (e.g. 2020 – present)"
            value={exp.dates ?? ''}
            onChange={(e) => updateExperience(index, { dates: e.target.value })}
            className="mt-2"
          />
          <textarea
            placeholder={'One bullet per line'}
            value={(exp.bullets ?? []).join('\n')}
            onChange={(e) => updateExperience(index, { bullets: e.target.value.split('\n').filter(Boolean) })}
            rows={3}
            className="mt-2 w-full rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
          />
          <button
            type="button"
            onClick={() => setExperience((prev) => prev.filter((_, i) => i !== index))}
            className="mt-2 text-xs text-[#B3261E] hover:underline"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="mt-5 flex justify-end">
        <Button onClick={save} loading={updateResume.isPending} disabled={updateResume.isPending}>
          Save base resume
        </Button>
      </div>
    </section>
  )
}

function VersionsPanel({ resumeId }: { resumeId: string }) {
  const versionsQuery = useVersions(resumeId)
  const applicationsQuery = useApplicationOptions()
  const generate = useGenerateResume(resumeId)

  const [showDialog, setShowDialog] = useState(false)
  const [applicationId, setApplicationId] = useState('')
  const [tone, setTone] = useState('concise')
  const [emphasize, setEmphasize] = useState('')

  const jobId = generate.data?.job_id ?? null
  const jobStatus = useJobStatus(jobId, Boolean(jobId) && generate.isSuccess)

  const running = generate.isPending || jobStatus.data?.status === 'running' || jobStatus.data?.status === 'queued'
  const finished = jobStatus.data?.status === 'succeeded' || jobStatus.data?.status === 'failed'

  const applications = applicationsQuery.data ?? []
  const versions = versionsQuery.data ?? []

  const selectedApp = applications.find((a) => a.id === applicationId)

  return (
    <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1F2937]">Generated versions</h2>
        <Button className="px-3 py-1.5 text-xs" onClick={() => setShowDialog(true)}>
          + Generate new version
        </Button>
      </div>

      {applications.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#F6F5F0] p-3 text-xs text-[#6B7280]">
          Create an application in the Pipeline first — generated resumes are tailored to a specific
          job.
        </p>
      ) : null}

      {versions.length === 0 ? (
        <p className="mt-4 text-sm text-[#6B7280]">No versions generated yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#F0EEE7]">
          {versions.map((version) => (
            <li key={version.id}>
              <Link
                to="/resume-studio/$versionId"
                params={{ versionId: version.id }}
                className="flex items-center justify-between py-3 hover:bg-[#FAFAF8]"
              >
                <div>
                  <p className="text-sm font-medium text-[#1F2937]">
                    Version from {new Date(version.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-[#9AA1AB]">
                    {version.generated_by_model ?? 'heuristic'} ·{' '}
                    {version.application_id ? 'tailored to an application' : 'general'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    version.reviewed_at
                      ? 'bg-[#E7F5EE] text-[#0F6E56]'
                      : 'bg-[#FDF6E8] text-[#8A5A1A]'
                  }`}
                >
                  {version.reviewed_at ? 'reviewed' : 'needs review'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {running ? (
        <p className="mt-4 text-sm text-[#6B7280]">
          Generating… this usually takes a few seconds.
        </p>
      ) : null}
      {finished && jobStatus.data?.status === 'succeeded' ? (
        <p className="mt-4 text-sm text-[#0F6E56]">Generation complete.</p>
      ) : null}
      {finished && jobStatus.data?.status === 'failed' ? (
        <p className="mt-4 text-sm text-[#B3261E]">
          Generation failed: {jobStatus.data?.error ?? 'unknown error'}
        </p>
      ) : null}

      {showDialog ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-sm font-semibold text-[#1F2937]">Generate a tailored version</h3>
            <label className="mt-4 block text-xs font-medium text-[#6B7280]">
              Application / job
            </label>
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
            >
              <option value="">Select an application…</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.label}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-medium text-[#6B7280]">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D6D3C9] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058]"
            >
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
              <option value="technical">Technical</option>
            </select>
            <label className="mt-4 block text-xs font-medium text-[#6B7280]">
              Emphasize (comma separated)
            </label>
            <Input
              value={emphasize}
              onChange={(e) => setEmphasize(e.target.value)}
              placeholder="backend, leadership"
              className="mt-1"
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDialog(false)} disabled={running}>
                Cancel
              </Button>
              <Button
                disabled={!applicationId || running}
                loading={running}
                onClick={() => {
                  generate.mutate({
                    application_id: applicationId,
                    job_id: selectedApp?.job_id ?? null,
                    tone,
                    emphasize: emphasize
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}