export function AuthExpired({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ padding: '8px 0 4px' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#1F2937', fontWeight: 600 }}>
        Your sign-in expired
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6B7280' }}>
        Sign in again to keep saving companies to your workspace.
      </p>
      <button
        onClick={onLogin}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 999,
          background: '#1F2937',
          color: '#fff',
          padding: '9px 0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Sign in
      </button>
    </div>
  )
}