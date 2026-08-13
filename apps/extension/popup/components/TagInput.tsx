export function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#1F2937' }}>
        Tags
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. fintech, ai, seed"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid #D6D3C9',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
        }}
      />
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9AA1AB' }}>Comma-separated</p>
    </div>
  )
}