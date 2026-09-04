import { LandingRing } from './LandingRing'

const CARDS = [
  {
    chip: 'NL',
    name: 'Northwind Labs',
    sub: 'Seed · Design tools',
    badge: 'Applied',
    badgeClass: 'b-applied',
    tags: ['Remote', 'Design'],
    foot: 'Applied 6d ago',
    score: { value: 71, color: '#3E5C8A' },
    style: { background: 'var(--color-slate-tint)', border: '1px solid #D3DFEE' },
  },
  {
    chip: 'FL',
    name: 'Ferro Labs',
    sub: 'Series B · Infra',
    badge: 'Interview',
    badgeClass: 'b-interview',
    tags: ['Hybrid · NYC', 'Backend'],
    foot: 'Interview in 3d',
    score: { value: 88, color: '#18A058' },
    style: { background: 'var(--color-emerald-tint)', border: '1px solid var(--color-emerald-tint-strong)' },
  },
  {
    chip: 'QT',
    name: 'Quiet Table',
    sub: 'Pre-seed · Consumer',
    badge: 'Saved',
    badgeClass: 'b-saved',
    tags: ['Remote', 'Full-stack'],
    foot: 'Enriching…',
    score: null,
    style: { background: 'var(--color-cream)', border: '1px solid var(--color-line-strong)' },
  },
  {
    chip: 'HX',
    name: 'Helio X',
    sub: 'Series A · Climate',
    badge: 'Interested',
    badgeClass: '',
    badgeStyle: {
      background: 'var(--color-amber-tint)',
      color: 'var(--color-amber)',
      border: '1px solid #F0DDB8',
    },
    tags: ['Onsite · SF', 'Hardware'],
    foot: 'Enriched 1d ago',
    score: { value: 55, color: '#B8791A' },
    style: { background: 'var(--color-amber-tint)', border: '1px solid #F0DDB8' },
  },
  {
    chip: 'SB',
    name: 'Skybase',
    sub: 'Series A · Devtools',
    badge: 'Offer',
    badgeClass: 'b-offer',
    tags: ['Remote', 'Platform'],
    foot: 'Offer received',
    chipStyle: { background: 'var(--color-emerald)' },
    score: { value: 95, color: '#18A058' },
    style: { background: '#fff', border: '1px solid var(--color-emerald)', boxShadow: '0 0 0 1px var(--color-emerald), var(--shadow-sm)' },
  },
  {
    chip: 'DR',
    name: 'Driftly',
    sub: 'Seed · Logistics',
    badge: 'Rejected',
    badgeClass: 'b-rejected',
    tags: ['Remote', 'Full-stack'],
    foot: 'Closed 2w ago',
    chipStyle: { background: 'var(--color-muted-2)' },
    score: null,
    style: { background: '#F3F2EF', border: '1px solid var(--color-line-strong)', opacity: 0.72 },
  },
]

export function SampleWorkspace() {
  return (
    <section className="section" id="opportunities">
      <div className="wrap">
        <p className="kicker">Your workspace</p>
        <h2 className="head">Every save becomes a structured record</h2>
        <p className="lede">
          Not a bookmark — a card with a status, a score, and a paper trail back to the source. This
          is what a Startup Workspace looks like after a few weeks of saving.
        </p>
        <div className="sample-grid">
          {CARDS.map((card) => (
            <div className="s-card" style={card.style} key={card.name}>
              <div className="bookmark">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M6 3h12v18l-6-4-6 4z" />
                </svg>
              </div>
              <div className="s-card-top">
                <div style={{ display: 'flex', gap: 10 }}>
                  <div
                    className="logo-chip"
                    style={{ width: 34, height: 34, fontSize: 12, ...card.chipStyle }}
                  >
                    {card.chip}
                  </div>
                  <div>
                    <h3>{card.name}</h3>
                    <p className="sub">{card.sub}</p>
                  </div>
                </div>
              </div>
              <span className={`badge ${card.badgeClass}`} style={card.badgeStyle}>
                <span className="d" />
                {card.badge}
              </span>
              <div className="s-card-meta">
                {card.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="s-card-foot">
                <span>{card.foot}</span>
                {card.score ? (
                  <LandingRing score={card.score.value} size={30} color={card.score.color} />
                ) : (
                  <span className="job-dot">
                    <span className="dot dot-running" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
