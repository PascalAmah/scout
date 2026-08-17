import { LandingRing } from './LandingRing'

export function Matching() {
  return (
    <section className="section" id="matching">
      <div className="wrap">
        <div className="feature-split">
          <div>
            <p className="kicker" style={{ textAlign: 'left' }}>
              Opportunity matching
            </p>
            <h2>A fit score you can actually question</h2>
            <p className="lede">
              Most matching tools give you a number and ask you to trust it. Scout shows its work —
              every score ships with the skills that matched, the gaps that didn't, and a
              plain-language reason, because an overconfident score can talk you out of a good
              application just as easily as into a bad one.
            </p>
            <ul className="mini-list">
              <li>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Two-stage scoring: fast embedding similarity narrows the field, then a closer pass
                checks explicit requirements.
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Gaps are always shown alongside matches — a score with no gaps is treated as a bug,
                not a perfect fit.
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Recalculates automatically when you update your CV or save a new role.
              </li>
            </ul>
            <a className="btn btn-primary" href="#">
              See how scoring works
            </a>
          </div>

          <div className="score-card-wrap">
            <div className="score-glow" />
            <div className="score-card">
              <div className="head-row">
                <div>
                  <h4>Senior UX Designer</h4>
                  <span className="sub">Northwind Labs · London, Hybrid</span>
                </div>
                <LandingRing score={62} size={64} color="#B8791A" />
              </div>
              <div className="chip-row">
                <span className="chip chip-match">DESIGN SYSTEMS</span>
                <span className="chip chip-match">FIGMA</span>
                <span className="chip chip-gap">B2B SAAS — GAP</span>
              </div>
              <div className="score-breakdown">
                <div className="row">
                  <span className="k">Matched skills</span>
                  <span className="v">6 / 8</span>
                </div>
                <div className="row">
                  <span className="k">Explicit requirement gaps</span>
                  <span className="v">2</span>
                </div>
                <div className="row">
                  <span className="k">Confidence</span>
                  <span className="v" style={{ color: 'var(--color-amber)' }}>
                    MODERATE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ticker-wrap">
          <p className="ticker-label">
            Illustrative hiring-signal deltas the enrichment pipeline can surface per company —
            sample output, not live data
          </p>
          <div className="ticker">
            <span className="tick">
              AI / ML roles <span className="up">↗ +142%</span>
            </span>
            <span className="tick">
              Series A postings <span className="up">↗ +18%</span>
            </span>
            <span className="tick">
              Remote roles <span className="down">↘ −6%</span>
            </span>
            <span className="tick">
              Design systems roles <span className="up">↗ +64%</span>
            </span>
            <span className="tick">
              Contract roles <span className="down">↘ −12%</span>
            </span>
            <span className="tick">
              Founding engineer roles <span className="up">↗ +37%</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
