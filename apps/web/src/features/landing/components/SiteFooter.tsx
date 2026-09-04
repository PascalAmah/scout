import { Link } from '@tanstack/react-router'

import { LensMark } from '../../../components/ui/LensMark'

const FOOT_COLS: Array<{ title: string; links: string[] }> = [
  {
    title: 'Product',
    links: ['Startup Workspace', 'Matches', 'Resume Studio', 'CRM', 'Browser extension'],
  },
  {
    title: 'Resources',
    links: ['How it works', 'FAQ', 'Changelog', 'Support'],
  },
  {
    title: 'Company',
    links: ['About', 'Privacy', 'Terms'],
  },
]

export function SiteFooter() {
  return (
    <div className="cta-outer">
      <div className="dark-section cta-final">
        <h2>
          Your next opportunity
          <br />
          is already tracked.
        </h2>
        <p>Free to start. No credit card. The extension takes about a minute to install.</p>
        <div className="btn-row">
          <Link className="btn btn-accent" to="/register">
            Start for free
          </Link>
          <a
            className="btn btn-secondary"
            href="#"
            style={{ background: 'transparent', color: '#fff', borderColor: '#2A3441' }}
          >
            Get the extension
          </a>
        </div>
      </div>

      <div className="footer-card">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href="#top">
              <LensMark size={24} />
              <span>Scout</span>
            </a>
            <p>
              The system of record and system of action for a startup job search — not a job board,
              and not a YC directory extension.
            </p>
          </div>
          {FOOT_COLS.map((col) => (
            <div className="foot-col" key={col.title}>
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-bottom">
          <span>© 2026 Scout. Prepares your applications — you always send them.</span>
          <span>emerald #18A058 · charcoal #1F2937</span>
        </div>
      </div>
    </div>
  )
}
