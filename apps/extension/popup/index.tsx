import { useEffect, useState, type FormEvent } from 'react'

import {
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 320,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#1F2937',
    padding: 16,
  },
  brand: { fontSize: 17, fontWeight: 600, marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #D6D3C9',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    width: '100%',
    border: 'none',
    borderRadius: 999,
    background: '#1F2937',
    color: '#fff',
    padding: '9px 0',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: { fontSize: 11, color: '#6B7280', marginTop: 10 },
  error: { fontSize: 12, color: '#A23B2A', margin: '0 0 8px' },
  muted: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  link: { color: '#0F6E56', fontSize: 12 },
}

function Popup() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detection, setDetection] = useState<DetectionState | null>(null)
  const [manual, setManual] = useState(false)

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
      const state = await getDetectionState()
      setDetection(state)
      setLoading(false)
    })()
  }, [])

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
    setEmail('')
    setPassword('')
  }

  async function save(payload: DetectedPayload, tags: string[]): Promise<void> {
    await setDetectionState({ status: 'saving', payload })
    setDetection({ status: 'saving', payload })
    try {
      const startup = { ...payload.startup, tags }
      const saved = await api<{
        startup_id: string
        job_id: string | null
        already_saved: boolean
        enrichment_status: string
      }>('/extension/quick-save', {
        method: 'POST',
        body: JSON.stringify({
          source: payload.source,
          source_url: payload.source_url,
          startup,
          job: payload.job ?? null,
        }),
      })
      const state = await updateDetectionState({
        status: 'saved',
        saved: { startup_id: saved.startup_id, startup_name: payload.startup.name ?? 'Startup' },
      })
      setDetection(state)
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 401) {
        const state = await updateDetectionState({ status: 'auth_required' })
        setDetection(state)
        return
      }
      const state = await updateDetectionState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong.',
      })
      setDetection(state)
      throw err
    }
  }

  if (loading) {
    return <div style={{ ...styles.container, color: '#6B7280', fontSize: 13 }}>Loading…</div>
  }

  return (
    <div style={styles.container}>
      <div style={{ ...styles.brand, fontFamily: 'Georgia, serif' }}>Scout</div>

      {!user ? (
        <form onSubmit={onSubmit}>
          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p style={styles.hint}>
            Uses the same account as the Scout web app.{' '}
            <a style={styles.link} href="http://localhost:5173/register" target="_blank" rel="noreferrer">
              Create an account
            </a>
          </p>
        </form>
      ) : (
        <>
          <p style={styles.muted}>
            Logged in as <strong>{user.email}</strong>.
          </p>
          {detection?.status === 'saved' && detection.saved ? (
            <Saved state={detection} />
          ) : detection?.status === 'saving' ? (
            <Saving />
          ) : detection?.status === 'detected' && detection.payload ? (
            <Detected payload={detection.payload} onSave={save} onManual={() => setManual(true)} />
          ) : detection?.status === 'auth_required' ? (
            <AuthExpired onLogin={() => setUser(null)} />
          ) : detection?.status === 'error' ? (
            <div style={{ fontSize: 13, color: '#A23B2A' }}>
              Couldn't save: {detection.error ?? 'unknown error'}{' '}
              <button
                onClick={() => {
                  setDetection({ status: 'detected' })
                }}
                style={{ background: 'none', border: 'none', color: '#0F6E56', fontWeight: 600, cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : manual ? (
            <ManualFallback onSave={save} onBack={() => setManual(false)} />
          ) : detection?.status === 'detected' ? (
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              Detected on this page.{' '}
              <button
                onClick={() => {
                  setDetection({ status: 'saving' })
                }}
                style={{ background: 'none', border: 'none', color: '#0F6E56', fontWeight: 600, cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          ) : (
            <Unsupported onManual={() => setManual(true)} />
          )}
          <button
            onClick={() => void onLogout()}
            style={{ ...styles.button, marginTop: 16, background: '#fff', border: '1px solid #D6D3C9', color: '#1F2937' }}
          >
            Sign out
          </button>
        </>
      )}
    </div>
  )
}

export default Popup