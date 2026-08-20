const CHIP_COLORS = ['#1F2937', '#18A058', '#3E5C8A', '#B8791A', '#0F6E56', '#8A5A11']

export function chipColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 997
  return CHIP_COLORS[hash % CHIP_COLORS.length]!
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
}

export function titleCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function compactAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}