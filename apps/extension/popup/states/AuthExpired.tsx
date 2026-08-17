import { CENTERED, CENTERED_BODY, CENTERED_TITLE, COLORS, btnAccent } from '../theme'

export function AuthExpired({ onLogin }: { onLogin: () => void }) {
  return (
    <div>
      <div style={CENTERED}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: COLORS.amberTint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '2px auto 14px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width={20} height={20} style={{ stroke: COLORS.amber }} aria-hidden>
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <b style={CENTERED_TITLE}>Your session expired</b>
        <p style={CENTERED_BODY}>
          Sign back in to keep saving — everything you&apos;ve already saved is untouched.
        </p>
      </div>
      <button style={btnAccent} onClick={onLogin}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={13} height={13} aria-hidden>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
        </svg>
        Sign in
      </button>
    </div>
  )
}
