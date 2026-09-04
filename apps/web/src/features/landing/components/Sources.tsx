import { LensMark } from '../../../components/ui/LensMark'

function GlobeLinks() {
  return (
    <svg className="globe-links" viewBox="0 0 807 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M406,28 Q322,88 232,128" />
      <path d="M406,28 Q492,88 578,128" />
      <path d="M406,28 Q250,160 92,226" />
      <path d="M406,28 Q362,172 320,228" />
      <path d="M406,28 Q452,172 488,228" />
      <path d="M406,28 Q564,160 716,226" />
    </svg>
  )
}

function NodeCard({
  children,
  dark = false,
}: {
  children: React.ReactNode
  dark?: boolean
}) {
  return <div className={`node-card${dark ? ' dark' : ''}`}>{children}</div>
}

export function Sources() {
  return (
    <section className="sources" id="sources">
      <div className="wrap">
        <div className="sources-head">
          <LensMark size={36} className="lens" />
          <div>
            <b>Where Scout looks</b>
            <span>Six sources, each handled by how it can actually be captured</span>
          </div>
        </div>

        <div className="scout-globe">
          <div className="globe-visual">
            <img src="/assets/globe-grid.png" alt="" className="globe-grid-img" />
            <GlobeLinks />
            <div className="globe-eye" title="Scout">
              <span className="eye-glow" />
              <LensMark size={50} />
            </div>
          </div>

          <div className="globe-nodes">
            <div className="orbit-node" style={{ left: '28.7%', top: '43.5%' }}>
              <NodeCard>
                <img src="/assets/logos/yc.png" alt="Y Combinator" />
              </NodeCard>
              <span className="tier-pill tier-api">Direct API</span>
            </div>
            <div className="orbit-node" style={{ left: '71.3%', top: '43.5%' }}>
              <NodeCard>
                <img src="/assets/logos/producthunt.png" alt="Product Hunt" style={{ height: 15 }} />
              </NodeCard>
              <span className="tier-pill tier-api">Direct API</span>
            </div>
            <div className="orbit-node" style={{ left: '11.4%', top: '77%' }}>
              <NodeCard>
                <img src="/assets/logos/wellfound.png" alt="Wellfound" />
              </NodeCard>
              <span className="tier-pill tier-crawl">Permitted crawl</span>
            </div>
            <div className="orbit-node" style={{ left: '39.6%', top: '77%' }}>
              <NodeCard dark>
                <img src="/assets/logos/techstars.png" alt="Techstars" style={{ height: 12 }} />
              </NodeCard>
              <span className="tier-pill tier-crawl">Permitted crawl</span>
            </div>
            <div className="orbit-node" style={{ left: '60.4%', top: '77%' }}>
              <NodeCard>
                <div className="node-mark">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
                  </svg>
                </div>
                <span className="node-label">Careers pages</span>
              </NodeCard>
              <span className="tier-pill tier-crawl">Permitted crawl</span>
            </div>
            <div className="orbit-node" style={{ left: '88.7%', top: '77%' }}>
              <NodeCard>
                <img src="/assets/logos/linkedin.png" alt="LinkedIn" style={{ height: 16 }} />
              </NodeCard>
              <span className="tier-pill tier-capture">User-capture only</span>
            </div>
          </div>
        </div>

        <p className="sources-note">
          Every source is classified by how it can be captured — direct API, permitted crawl, or
          user-capture only. LinkedIn saves come exclusively from your own browser, on your explicit
          action — there's no server-side LinkedIn crawler.
        </p>
      </div>
    </section>
  )
}
