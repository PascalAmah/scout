import { Link } from '@tanstack/react-router'

import { LensMark } from '../../../components/ui/LensMark'

export function SiteNav() {
  return (
    <div className="navbar">
      <div className="wrap nav-inner">
        <a className="brand" href="#top">
          <LensMark size={26} />
          <span>Scout</span>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#sources">Sources</a>
          </li>
          <li>
            <a href="#workflow">How it works</a>
          </li>
          <li>
            <a href="#matching">Matching</a>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
        <div className="nav-cta">
          <Link className="btn btn-ghost" to="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary" to="/register">
            Start for free
          </Link>
        </div>
      </div>
    </div>
  )
}
