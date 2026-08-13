export function Unsupported({ onManual }: { onManual: () => void }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{ margin: 0, fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
        Browsing a company? Open the popup on a <strong>Y Combinator</strong> company page or any{' '}
        <strong>careers / jobs</strong> page (Greenhouse, Lever, Ashby…) to save it to your workspace.
      </p>
      <button
        onClick={onManual}
        style={{
          width: '100%',
          marginTop: 12,
          border: '1px solid #D6D3C9',
          borderRadius: 999,
          background: '#fff',
          color: '#1F2937',
          padding: '9px 0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Save manually
      </button>
    </div>
  )
}