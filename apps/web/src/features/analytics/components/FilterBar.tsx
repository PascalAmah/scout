export type AnalyticsRange = '8w' | '30d' | 'all'
export type AnalyticsSource = '' | 'yc' | 'generic_careers' | 'manual'

export function FilterBar({
  range,
  source,
  onRangeChange,
  onSourceChange,
}: {
  range: AnalyticsRange
  source: AnalyticsSource
  onRangeChange: (range: AnalyticsRange) => void
  onSourceChange: (source: AnalyticsSource) => void
}) {
  return (
    <div className="flex gap-2.5">
      <select
        aria-label="Date range"
        value={range}
        onChange={(e) => onRangeChange(e.target.value as AnalyticsRange)}
        className="rounded-lg border border-[#D6D3C9] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1F2937]"
      >
        <option value="8w">Last 8 weeks</option>
        <option value="30d">Last 30 days</option>
        <option value="all">All time</option>
      </select>
      <select
        aria-label="Source"
        value={source}
        onChange={(e) => onSourceChange(e.target.value as AnalyticsSource)}
        className="rounded-lg border border-[#D6D3C9] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#1F2937]"
      >
        <option value="">All sources</option>
        <option value="yc">YC</option>
        <option value="generic_careers">Careers pages</option>
        <option value="manual">Manual</option>
      </select>
    </div>
  )
}
