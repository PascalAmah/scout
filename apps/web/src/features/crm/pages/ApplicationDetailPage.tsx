import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '../../../components/ui/Button'
import { APPLICATION_STATUSES, OUTREACH_CHANNELS } from '../api'
import type { ApplicationDetail, OutreachChannel } from '../api'
import { ApplicationStatusBadge } from '../components/ApplicationCard'
import {
  useApplication,
  useArchiveApplication,
  useGenerateOutreach,
  useOutreachJobStatus,
  useReviewOutreach,
  useUpdateApplicationStatus,
  useUpdateOutreach,
} from '../hooks'

export function ApplicationDetailPage() {
  const { applicationId } = useParams({ from: '/_app/crm/applications/$applicationId' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateStatus = useUpdateApplicationStatus()
  const archive = useArchiveApplication()
  const [channel, setChannel] = useState<OutreachChannel>('cover_letter')
  const [jobId, setJobId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const generatingRef = useRef(false)

  const appQuery = useApplication(applicationId)
  const app = appQuery.data
  const generate = useGenerateOutreach(applicationId)
  const jobStatus = useOutreachJobStatus(jobId)
  const review = useReviewOutreach(applicationId)
  const updateOutreach = useUpdateOutreach(applicationId)

  // /outreach/generate returns 202 immediately; the actual copy is produced by
  // an async worker job. Keep the button locked until that job settles, and
  // refresh the application once it succeeds so the generated copy appears
  // without a page reload. The ref also guards against double-firing on rapid
  // clicks (the mutation's isPending clears before the first status poll).
  const startGenerate = () => {
    if (generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)
    setJobId(null)
    generate.mutate(channel, {
      onSuccess: (res) => setJobId(res.job_id),
      onError: () => {
        generatingRef.current = false
        setGenerating(false)
      },
    })
  }

  useEffect(() => {
    const status = jobStatus.data?.status
    if (status === 'succeeded' || status === 'failed') {
      generatingRef.current = false
      setGenerating(false)
      if (status === 'succeeded') {
        void queryClient.invalidateQueries({ queryKey: ['crm', 'applications', applicationId] })
      }
    }
  }, [jobStatus.data?.status, applicationId, queryClient])

  if (!app) {
    return <p className="py-12 text-center text-sm text-[#6B7280]">{appQuery.isLoading ? 'Loading…' : 'Not found'}</p>
  }

  return (
    <div className="max-w-2xl">
      <Link to="/crm" className="text-sm text-[#6B7280] hover:text-[#1F2937]">
        ← Pipeline
      </Link>
      <div className="mt-2 rounded-xl border border-[#E5E3DC] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#1F2937]">
              {app.startup?.name ?? 'Unknown startup'}
            </h1>
            {app.job?.title ? <p className="mt-1 text-sm text-[#6B7280]">{app.job.title}</p> : null}
          </div>
          <ApplicationStatusBadge status={app.status} />
        </div>

        {app.startup?.website ? (
          <a href={app.startup.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[#18A058] hover:underline">
            {new URL(app.startup.website).hostname.replace('www.', '')}
          </a>
        ) : null}

        <div className="mt-6 border-t border-[#F0EEE7] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9AA1AB]">Status</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {APPLICATION_STATUSES.filter((s) => s !== 'rejected').map((status) => (
              <Button
                key={status}
                variant={status === app.status ? 'primary' : 'ghost'}
                className="px-3 py-1.5 text-xs"
                loading={updateStatus.isPending}
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ applicationId, status })}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#F0EEE7] pt-4">
          <Button
            variant="ghost"
            className="text-xs text-[#B3261E]"
            loading={archive.isPending}
            onClick={() => {
              if (window.confirm('Archive this application?')) {
                archive.mutate(applicationId, {
                  onSuccess: () => navigate({ to: '/crm' }),
                })
              }
            }}
          >
            Archive
          </Button>
        </div>
      </div>

      <TimelineSection events={app.timeline ?? []} />

      <div className="mt-6 rounded-xl border border-[#E5E3DC] bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1F2937]">Outreach</h2>
            <div className="flex items-center gap-2">
              <select
                value={channel}
                disabled={generating}
                onChange={(e) => setChannel(e.target.value as OutreachChannel)}
                className="rounded-lg border border-[#D6D3C9] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#18A058] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {OUTREACH_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <Button
                className="px-3 py-1.5 text-xs"
                disabled={generating}
                loading={generating}
                onClick={startGenerate}
              >
                Generate copy
              </Button>
            </div>
          </div>
          {generating ? (
            <p className="mt-3 text-sm text-[#6B7280]">Generating… this usually takes a few seconds.</p>
          ) : null}

          {app.outreach.map((item) => (
            <div key={item.id} className="mt-3 rounded-lg border border-[#F0EEE7] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize text-[#1F2937]">
                  {item.channel.replace('_', ' ')}
                </p>
                <span className="rounded-full bg-[#F6F5F0] px-2.5 py-0.5 text-[11px] text-[#6B7280]">
                  {item.status}
                </span>
              </div>
              {item.content ? (
                <p className="mt-2 whitespace-pre-line text-sm text-[#4B5563]">{item.content}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                {!item.reviewed_at && item.status === 'draft' ? (
                  <Button
                    className="px-3 py-1 text-xs"
                    disabled={review.isPending}
                    loading={review.isPending}
                    onClick={() => review.mutate(item.id)}
                  >
                    Mark reviewed
                  </Button>
                ) : null}
                {item.status === 'draft' ? (
                  <Button
                    variant="ghost"
                    className="px-3 py-1 text-xs"
                    disabled={updateOutreach.isPending}
                    onClick={() => updateOutreach.mutate({ outreachId: item.id, status: 'sent' })}
                  >
                    Mark sent
                  </Button>
                ) : null}
                {item.sent_at ? (
                  <span className="text-xs text-[#9AA1AB]">
                    Sent {new Date(item.sent_at).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {app.resume_version ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-[#F0EEE7] p-3">
              <div>
                <p className="text-sm font-medium text-[#1F2937]">Resume version</p>
                <p className="text-xs text-[#9AA1AB]">
                  Generated {new Date(app.resume_version.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  app.resume_version.reviewed_at
                    ? 'bg-[#E7F5EE] text-[#0F6E56]'
                    : 'bg-[#FDF6E8] text-[#8A5A1A]'
                }`}
              >
                {app.resume_version.reviewed_at ? 'reviewed' : 'needs review'}
              </span>
            </div>
          ) : null}
      </div>
    </div>
  )
}

function TimelineSection({ events }: { events: ApplicationDetail['timeline'] }) {
  if (!events.length) return null
  return (
    <div className="mt-6 rounded-xl border border-[#E5E3DC] bg-white p-6">
      <h2 className="text-sm font-semibold text-[#1F2937]">Timeline</h2>
      <ol className="mt-4">
        {events.map((event, index) => (
          <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1.5 size-2.5 rounded-full ${
                  event.type === 'status_change' ? 'bg-[#18A058]' : 'bg-[#9AA1AB]'
                }`}
              />
              {index < events.length - 1 ? (
                <span className="w-px flex-1 bg-[#E5E3DC]" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1F2937]">{event.title}</p>
              <p className="text-xs text-[#9AA1AB]">{new Date(event.at).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}