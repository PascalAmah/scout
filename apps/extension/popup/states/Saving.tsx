export function Saving() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0' }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '3px solid #E5E3DC',
          borderTopColor: '#18A058',
          animation: 'scout-spin 0.8s linear infinite',
          marginBottom: 10,
        }}
      />
      <style>{`@keyframes scout-spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Saving to your workspace…</p>
    </div>
  )
}