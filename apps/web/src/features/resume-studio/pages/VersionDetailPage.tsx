import { useParams } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { ApiRequestError } from '../../../lib/api-client'
import type { ResumeContent } from '../api'
import { downloadVersionPdf } from '../api'
import { useResumes, useReviewVersion, useVersion } from '../hooks'

function SkillsDiff({ base, version }: { base: ResumeContent; version: ResumeContent }) {
  const baseSkills = base.skills ?? []
  const versionSkills = version.skills ?? []
  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[#9AA1AB]">Skills</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {versionSkills.map((skill) => {
          const added = !baseSkills.includes(skill)
          return (
            <span
              key={skill}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                added ? 'bg-[#E7F5EE] text-[#0F6E56]' : 'bg-[#F6F5F0] text-[#6B7280]'
              }`}
            >
              {skill}
              {added ? ' +' : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SummaryDiff({ base, version }: { base: ResumeContent; version: ResumeContent }) {
  if (!version.summary) return null
  const changed = base.summary !== version.summary
  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#9AA1AB]">
        Summary {changed ? '· rewritten for this role' : ''}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">{version.summary}</p>
    </div>
  )
}

export function VersionDetailPage() {
  const { versionId } = useParams({ from: '/_app/resume-studio/$versionId' })
  const versionQuery = useVersion(versionId)
  const resumesQuery = useResumes()
  const review = useReviewVersion()
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const version = versionQuery.data
  const baseResume = resumesQuery.data?.find((r) => r.id === version?.resume_id)

  if (!version) {
    return (
      <p className="py-12 text-center text-sm text-[#6B7280]">
        {versionQuery.isLoading ? 'Loading…' : 'Version not found'}
      </p>
    )
  }

  const baseContent: ResumeContent = baseResume?.content ?? {}
  const versionContent: ResumeContent = version.content ?? {}
  const isReviewed = version.reviewed_at != null
  const downloadVersionId = version.id

  async function download() {
    setDownloadError(null)
    try {
      await downloadVersionPdf(downloadVersionId)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setDownloadError(
          err.code === 'NOT_REVIEWED'
            ? 'Review this version before downloading.'
            : err.message,
        )
      } else {
        setDownloadError('Download failed.')
      }
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">Review version</h1>
        <div className="flex items-center gap-2">
          {!isReviewed ? (
            <Button
              onClick={() => review.mutate(version.id)}
              loading={review.isPending}
              disabled={review.isPending}
            >
              Mark reviewed
            </Button>
          ) : (
            <span className="rounded-full bg-[#E7F5EE] px-3 py-1 text-xs font-medium text-[#0F6E56]">
              Reviewed
            </span>
          )}
          <Button variant="ghost" onClick={() => void download()} disabled={!isReviewed}>
            Download PDF
          </Button>
        </div>
      </div>

      {!isReviewed ? (
        <p className="mt-2 rounded-lg bg-[#FDF6E8] p-3 text-xs text-[#8A5A1A]">
          Review the generated content below, then explicitly mark it reviewed. Download is blocked
          until you do — Scout never exports generated content you haven't seen.
        </p>
      ) : null}
      {downloadError ? <p className="mt-2 text-xs text-[#B3261E]">{downloadError}</p> : null}

      <div className="mt-6 rounded-xl border border-[#E5E3DC] bg-white p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#9AA1AB]">
            Generated {new Date(version.created_at).toLocaleString()} by{' '}
            {version.generated_by_model ?? 'heuristic'}
          </p>
          {version.application_id ? (
            <span className="rounded-full bg-[#F6F5F0] px-2.5 py-0.5 text-[11px] text-[#6B7280]">
              tailored to an application
            </span>
          ) : null}
        </div>

        <SummaryDiff base={baseContent} version={versionContent} />
        <SkillsDiff base={baseContent} version={versionContent} />

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9AA1AB]">Experience</p>
          {(versionContent.experience ?? []).map((exp, index) => (
            <div key={index} className="mt-3 rounded-lg border border-[#F0EEE7] p-3">
              <p className="text-sm font-semibold text-[#1F2937]">
                {exp.title ?? 'Role'} <span className="font-normal text-[#6B7280]">@ {exp.company}</span>
              </p>
              {exp.dates ? <p className="text-xs text-[#9AA1AB]">{exp.dates}</p> : null}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#4B5563]">
                {(exp.bullets ?? []).map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}