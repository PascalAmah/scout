import { Link } from '@tanstack/react-router'

import { LandingRing } from './LandingRing'

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="wrap">
        <span className="eyebrow-pill">
          <span className="dot" />
          Now enriching from YC + careers pages
        </span>
        <h1>
          The startup job search,
          <br />
          <em>with a memory.</em>
        </h1>
        <p className="sub">
          Save a company once. Scout enriches it, scores your real fit, and drafts the first
          version of your resume and outreach — so the next application doesn't start from zero
          either.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-accent" to="/register">
            Start for free
          </Link>
          <a className="btn btn-secondary" href="#workflow">
            See how it works
          </a>
        </div>
        <p className="hero-note">No credit card. No auto-apply — you review and send everything yourself.</p>

        {/* bento */}
        <div className="bento">
          <div className="tile startup-mock">
            <div className="startup-mock-head">
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="logo-chip">LH</div>
                <div>
                  <h3>Lumina Health</h3>
                  <p className="sub">Series A · Hardware · Enriched 3d ago</p>
                </div>
              </div>
              <span className="badge b-interview">
                <span className="d" />
                Interview
              </span>
            </div>
            <div className="job-row">
              <span className="role">Backend Engineer</span>
              <span className="pay">$140k–$180k</span>
            </div>
            <div className="job-row">
              <span className="role">Robotics Software Lead</span>
              <span className="pay">$170k–$210k</span>
            </div>
            <div className="job-row">
              <span className="role">Founding Applications Eng.</span>
              <span className="pay">$150k–$195k</span>
            </div>
            <div className="startup-mock-foot">
              <span className="mini-note">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                Enrichment: succeeded
              </span>
              <span className="mini-note">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
                Source: YC
              </span>
            </div>
          </div>

          <div className="bento-right">
            <div className="tile match-panel">
              <div className="top">
                <span className="lbl">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" style={{ stroke: '#0F6E56' }}>
                    <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
                  </svg>
                  Fit score
                </span>
                <LandingRing score={87} size={52} color="#18A058" />
              </div>
              <p className="match-explain">
                Strong overlap with your recent backend and API work — 3 years of Python matches
                their stated requirement directly.
              </p>
              <div className="chip-row">
                <span className="chip chip-match">PYTHON</span>
                <span className="chip chip-match">FASTAPI</span>
                <span className="chip chip-gap">K8S — GAP</span>
              </div>
            </div>
            <div className="bento-right-bottom">
              <div className="tile trust-card">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <b>You always click send</b>
                <p>Scout never auto-submits.</p>
              </div>
              <div className="tile trust-card alt">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M12 3v18M3 12h18" />
                </svg>
                <b>Grounded in your CV</b>
                <p>No invented experience.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
