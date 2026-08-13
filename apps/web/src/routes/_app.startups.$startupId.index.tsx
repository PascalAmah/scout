import { createFileRoute } from '@tanstack/react-router'

import { Button } from '../components/ui/Button'
import { useStartup, useTriggerEnrich } from '../features/startups/hooks'

export const Route = createFileRoute('/_app/startups/$startupId/')({
  component: StartupOverviewTab,
})

function StartupOverviewTab() {
  const { startupId } = Route.useParams()
  const startupQuery = useStartup(startupId)
  const triggerEnrich = useTriggerEnrich()
  const startup = startupQuery.data

  if (!startup) return null

  const link = (url: string | null, label: string) =>
    url ? (
      <a href={url} target="_blank" rel="noreferrer" className="text-[#18A058] hover:underline">
        {label}
      </a>
    ) : null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#1F2937]">About</h2>
            {startup.enrichment_status !== 'succeeded' ? (
              <Button
                variant="ghost"
                className="px-3 py-1.5 text-xs"
                loading={triggerEnrich.isPending}
                onClick={() => triggerEnrich.mutate(startupId)}
              >
                {startup.enrichment_status === 'none' ? 'Enrich' : 'Re-enrich'}
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">
            {startup.summary ?? 'No summary yet — trigger enrichment or add one.'}
          </p>
          {startup.website ? (
            <p className="mt-3 text-sm">
              Website: {link(startup.website, new URL(startup.website).hostname.replace('www.', ''))}
            </p>
          ) : null}
          {startup.source_url ? (
            <p className="mt-1 text-sm">
              Source: {link(startup.source_url, startup.source ?? 'listing')}
            </p>
          ) : null}
          {startup.last_enriched_at ? (
            <p className="mt-1 text-xs text-[#9AA1AB]">
              Last enriched {new Date(startup.last_enriched_at).toLocaleString()}
            </p>
          ) : null}
        </section>

        {startup.tech_stack?.length ? (
          <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Tech stack</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {startup.tech_stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-[#E5E3DC] bg-[#FAFAF8] px-3 py-1 text-xs text-[#1F2937]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Open roles</h2>
          {startup.jobs.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No roles captured yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#F0EEE7]">
              {startup.jobs.map((job) => (
                <li key={job.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#1F2937]">{job.title}</p>
                      <p className="text-xs text-[#6B7280]">
                        {[job.location, job.remote ? 'Remote' : null, job.employment_type]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-[#18A058] hover:underline"
                      >
                        View →
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Founders</h2>
          {startup.founders.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No founders captured yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {startup.founders.map((founder) => (
                <li key={founder.id}>
                  <p className="text-sm font-medium text-[#1F2937]">{founder.name}</p>
                  {founder.title ? <p className="text-xs text-[#6B7280]">{founder.title}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[#E5E3DC] bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-[#1F2937]">Tags</h2>
          {(startup.tags ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No tags yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {(startup.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-full bg-[#F3F1EA] px-3 py-1 text-xs text-[#1F2937]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}