import { useEffect, useState, type FormEvent } from 'react'

import {
  WEB_BASE,
  api,
  clearTokens,
  getTokens,
  setTokens,
  type TokenResponse,
  type User,
} from '../background/auth-sync'
import {
  getDetectionState,
  setDetectionState,
  updateDetectionState,
  type DetectedPayload,
  type DetectionState,
} from '../background/state'
import { Saved } from './states/Saved'
import { Saving } from './states/Saving'
import { Detected } from './states/Detected'
import { Unsupported } from './states/Unsupported'
import { ManualFallback } from './states/ManualFallback'
import { AuthExpired } from './states/AuthExpired'
import { LensMark } from './components/LensMark'
import { COLORS, FIELD_INPUT, FIELD_LABEL, FONTS, btnAccent, btnGhost } from './theme'

function Popup() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detection, setDetection] = useState<DetectionState | null>(null)
  const [manual, setManual] = useState(false)
  const [tabInfo, setTabInfo] = useState<{ url?: string; title?: string } | null>(null)

  useEffect(() => {
    void (async () => {
      const tokens = await getTokens()
      let authed: User | null = null
      if (tokens) {
        try {
          authed = await api<User>('/auth/me')
        } catch {
          await clearTokens()
        }
      }
      setUser(authed)

      // The stored detection state is global and can be stale (from another
      // tab or an earlier navigation). Ask the background to re-detect the
      // active tab and hand back the fresh state in one awaited round-trip —
      // the background only responds after writing the new state, so the
      // popup can never show another tab's saved/detected state.
      let state = await getDetectionState()
      try {
        const fresh = (await chrome.runtime.sendMessage({ type: 'scout:re-detect-tab' })) as
          | DetectionState
          | undefined
        if (fresh) state = fresh
      } catch {
        // No background handler (or no content script) — keep the stored state.
      }
      setDetection(state)
      setLoading(false)
    })()
  }, [])

  async function openManual() {
    setManual(true)
    if (tabInfo === null) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        setTabInfo(tab ? { url: tab.url, title: tab.title } : {})
      } catch {
        setTabInfo({})
      }
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const data = await api<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      await setTokens(data.access_token, data.refresh_token)
      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onLogout() {
    await clearTokens()
    await setDetectionState({ status: 'none' })
    setUser(null)
    setDetection({ status: 'none' })
    setManual(false)
    setEmail('')
    setPassword('')
  }

  /**
   * Save via the background service worker, not the popup — the fetch keeps
   * running if the user closes the popup, so "safe to close" is true.
   */
  async function save(payload: DetectedPayload, tags: string[]): Promise<void> {
    await setDetectionState({ status: 'saving', payload })
    setDetection({ status: 'saving', payload })
    const resp = (await chrome.runtime.sendMessage({ type: 'scout:save', payload, tags })) as
      | { ok: true; state: DetectionState }
      | { ok: false; status?: number; state: DetectionState }
    setDetection(resp.state)
    if (!resp.ok && resp.status !== 401) {
      throw new Error(resp.state.error ?? 'Something went wrong.')
    }
  }

  function savedItemLabel(): string | null {
    const payload = detection?.payload
    if (!payload) return null
    if (payload.job?.title) {
      const company = payload.startup?.name ?? 'Startup'
      return `${payload.job.title} at ${company}`
    }
    return payload.startup?.name ?? null
  }

  const stateView = () => {
    if (detection?.status === 'saved' && detection.saved) {
      return <Saved state={detection} />
    }
    if (detection?.status === 'saving') {
      return <Saving label={savedItemLabel()} />
    }
    if (detection?.status === 'auth_required') {
      return <AuthExpired onLogin={() => setUser(null)} />
    }
    if (detection?.status === 'error') {
      return (
        <div
          style={{
            background: COLORS.brickTint,
            border: '1px solid #EFD2CB',
            borderRadius: 8,
            padding: '11px 13px',
          }}
        >
          <b style={{ display: 'block', fontSize: 13, color: COLORS.brick, marginBottom: 4 }}>
            Couldn&apos;t save
          </b>
          <p style={{ margin: '0 0 10px', fontSize: 11.5, color: COLORS.brick, lineHeight: 1.5 }}>
            {detection.error ?? 'Something went wrong.'}
          </p>
          <button
            onClick={() => {
              if (detection.payload) void save(detection.payload, [])
              else setDetection({ status: 'none' })
            }}
            style={{ ...btnGhost, padding: '6px', fontSize: 12, border: 'none', background: 'none', color: COLORS.brick }}
          >
            Try again
          </button>
        </div>
      )
    }
    if (manual) {
      return (
        <ManualFallback
          onSave={save}
          onBack={() => setManual(false)}
          initialUrl={tabInfo?.url ?? detection?.payload?.source_url}
          initialTitle={tabInfo?.title}
        />
      )
    }
    if (detection?.status === 'detected' && detection.payload) {
      return <Detected payload={detection.payload} onSave={save} onManual={() => void openManual()} />
    }
    return <Unsupported onManual={() => void openManual()} />
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { margin: 0; }
        @keyframes scout-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          width: 360,
          fontFamily: FONTS.sans,
          color: COLORS.charcoal,
          background: COLORS.white,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '13px 16px',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <LensMark size={16} />
            <span style={{ fontFamily: FONTS.serif, fontWeight: 600, fontSize: 14, color: COLORS.charcoal }}>
              Scout
            </span>
          </span>
          <button
            onClick={() => window.close()}
            aria-label="Close"
            style={{
              marginLeft: 'auto',
              width: 20,
              height: 20,
              color: COLORS.muted2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width={12} height={12} style={{ stroke: 'currentColor' }} aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '18px 16px', maxHeight: 540, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ margin: 0, fontSize: 13, color: COLORS.muted, textAlign: 'center' }}>Loading…</p>
          ) : !user ? (
            <form onSubmit={onSubmit}>
              <label style={FIELD_LABEL} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...FIELD_INPUT, marginBottom: 10 }}
              />
              <label style={FIELD_LABEL} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...FIELD_INPUT, marginBottom: 12 }}
              />
              {error ? (
                <p style={{ margin: '0 0 8px', fontSize: 11.5, color: COLORS.brick }}>{error}</p>
              ) : null}
              <button type="submit" disabled={submitting} style={btnAccent}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: COLORS.muted2, lineHeight: 1.5 }}>
                Uses the same account as the Scout web app.{' '}
                <a style={{ color: COLORS.emeraldDark, fontWeight: 600 }} href={`${WEB_BASE}/register`} target="_blank" rel="noreferrer">
                  Create an account
                </a>
              </p>
            </form>
          ) : (
            <>
              {stateView()}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 10,
                  borderTop: `1px solid ${COLORS.line}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    color: COLORS.muted2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </span>
                <button
                  onClick={() => void onLogout()}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: COLORS.muted,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Popup
