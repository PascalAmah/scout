import { useEffect, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import type { CVProfile } from '../../cv/api'
import { useUpdateResume } from '../hooks'
import type { ResumeContent, ResumeOut } from '../api'

function timeAgo(date: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days <= 0) return 'edited today'
  if (days === 1) return 'edited 1 day ago'
  return `edited ${days} days ago`
}

function ResumeDoc({
  name,
  roleLine,
  content,
}: {
  name: string
  roleLine: string | null
  content: ResumeContent
}) {
  return (
    <div className="px-6.5 pb-2 pt-6.5">
      <h3 className="font-serif text-[19px] font-semibold text-charcoal">{name}</h3>
      {roleLine ? <p className="mb-5 text-[12.5px] text-muted">{roleLine}</p> : null}

      {content.summary ? (
        <section className="mb-5">
          <h4 className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[1px] text-muted-2">
            Summary
          </h4>
          <p className="text-[13px] leading-[1.65] text-charcoal">{content.summary}</p>
        </section>
      ) : null}

      {(content.experience ?? []).map((exp, index) => (
        <section key={index} className="mb-5">
          <h4 className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[1px] text-muted-2">
            {exp.company ? `Experience — ${exp.company}` : 'Experience'}
          </h4>
          <ul className="m-0 list-none p-0">
            {(exp.bullets ?? []).map((bullet, bi) => (
              <li
                key={bi}
                className="relative mb-1.5 pl-3.5 text-[13px] leading-[1.6] text-charcoal before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-muted-2"
              >
                {bullet}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {(content.skills ?? []).length > 0 ? (
        <section className="mb-5">
          <h4 className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[1px] text-muted-2">
            Skills
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(content.skills ?? []).map((skill) => (
              <span
                key={skill}
                className="rounded-[7px] border border-line bg-paper px-2.5 py-1 text-[11.5px]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/**
 * Left column (mockup `.base-sticky`): the base resume as a rendered document
 * with an Edit toggle that swaps to the editor form. "Source of truth" —
 * generated versions are separate copies, never edits to this.
 */
export function BaseResumePanel({ resume, cv }: { resume: ResumeOut; cv: CVProfile | null }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(resume.title)
  const [summary, setSummary] = useState(resume.content?.summary ?? '')
  const [skills, setSkills] = useState((resume.content?.skills ?? []).join(', '))
  const [experience, setExperience] = useState(resume.content?.experience ?? [])
  const updateResume = useUpdateResume(resume.id)

  useEffect(() => {
    setTitle(resume.title)
    setSummary(resume.content?.summary ?? '')
    setSkills((resume.content?.skills ?? []).join(', '))
    setExperience(resume.content?.experience ?? [])
  }, [resume])

  const parsedName = cv?.structured_data?.name?.trim()
  const name = parsedName || cv?.name?.trim() || 'Your resume'
  const roles = cv?.structured_data?.roles ?? []
  const years = cv?.structured_data?.years_of_experience
  const roleLine =
    [roles[0], years != null ? `${years} years of experience` : null].filter(Boolean).join(' · ') ||
    null

  function save() {
    updateResume.mutate({
      title,
      content: {
        name: resume.content?.name,
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
    setEditing(false)
  }

  function updateExperience(index: number, patch: Partial<(typeof experience)[number]>) {
    setExperience((prev) => prev.map((exp, i) => (i === index ? { ...exp, ...patch } : exp)))
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2.5 border-b border-line px-5 py-4">
        <h2 className="text-[14.5px] font-semibold text-charcoal">Base resume</h2>
        <span className="text-[11px] font-medium text-muted-2">Source of truth</span>
      </div>

      {editing ? (
        <div className="px-5 py-4">
          <label className="mt-1 block text-xs font-medium text-muted">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />

          <label className="mt-4 block text-xs font-medium text-muted">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald"
          />

          <label className="mt-4 block text-xs font-medium text-muted">
            Skills (comma separated)
          </label>
          <Input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="mt-1.5"
          />

          <div className="mt-4 flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Experience</label>
            <button
              type="button"
              onClick={() =>
                setExperience((prev) => [...prev, { company: '', title: '', dates: '', bullets: [] }])
              }
              className="text-xs font-medium text-emerald hover:underline"
            >
              + Add position
            </button>
          </div>
          {experience.map((exp, index) => (
            <div key={index} className="mt-3 rounded-lg border border-line p-3">
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
                placeholder="One bullet per line"
                value={(exp.bullets ?? []).join('\n')}
                onChange={(e) =>
                  updateExperience(index, { bullets: e.target.value.split('\n').filter(Boolean) })
                }
                rows={3}
                className="mt-2 w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald"
              />
              <button
                type="button"
                onClick={() => setExperience((prev) => prev.filter((_, i) => i !== index))}
                className="mt-2 text-xs text-brick hover:underline"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={updateResume.isPending}>
              Save base resume
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ResumeDoc name={name} roleLine={roleLine} content={resume.content ?? {}} />
          <div className="flex items-center justify-between border-t border-line bg-paper px-5 py-3.5">
            <span className="text-[11px] text-muted-2">
              {resume.updated_at ? timeAgo(resume.updated_at) : '—'}
            </span>
            <Button variant="secondary" className="px-3.5 py-1.5 text-[12.5px]" onClick={() => setEditing(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Edit
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
