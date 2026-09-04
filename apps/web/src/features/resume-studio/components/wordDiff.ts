export interface DiffSegment {
  type: 'same' | 'del' | 'ins'
  text: string
}

const MAX_TOKENS = 400

/**
 * Word-level diff between two strings (LCS over whitespace-tokenized words).
 * Returns null when inputs are too long to diff cheaply — callers then fall
 * back to rendering the version text plainly.
 */
export function diffWords(a: string, b: string): DiffSegment[] | null {
  const ta = a.trim().split(/\s+/).filter(Boolean)
  const tb = b.trim().split(/\s+/).filter(Boolean)
  if (ta.length > MAX_TOKENS || tb.length > MAX_TOKENS) return null
  if (ta.length === 0 && tb.length === 0) return []

  // LCS table over words.
  const n = ta.length
  const m = tb.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const segments: DiffSegment[] = []
  let i = 0
  let j = 0
  const flush = (type: 'same' | 'del' | 'ins', words: string[]) => {
    if (words.length === 0) return
    segments.push({ type, text: words.join(' ') })
  }

  // Walk the LCS table. Every branch below must consume at least one token:
  // when two strings diverge and the DP values tie (dp[i+1][j] === dp[i][j+1]),
  // the run-walk alone makes no progress — without the forced +1 this loop
  // spins forever and freezes the tab (diffWords runs synchronously in render).
  let steps = 0
  while (i < n && j < m) {
    if (++steps > n + m + 1) break // safety net — never hit with guaranteed progress
    if (ta[i] === tb[j]) {
      let k = i
      let l = j
      while (k < n && l < m && ta[k] === tb[l]) {
        k++
        l++
      }
      flush('same', tb.slice(j, l))
      i = k
      j = l
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      let k = i
      while (k < n && (j >= m || dp[k + 1][j] > dp[k][j])) k++
      if (k === i) k = i + 1 // guarantee progress
      flush('del', ta.slice(i, k))
      i = k
    } else {
      let l = j
      while (l < m && (i >= n || dp[i][l + 1] > dp[i][l])) l++
      if (l === j) l = j + 1 // guarantee progress
      flush('ins', tb.slice(j, l))
      j = l
    }
  }
  if (i < n) flush('del', ta.slice(i))
  if (j < m) flush('ins', tb.slice(j))

  return segments
}
