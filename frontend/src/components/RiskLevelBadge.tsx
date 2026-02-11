import { RiskLevel } from '@shared'

const styles: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'bg-emerald-100 text-emerald-800',
  [RiskLevel.MEDIUM]: 'bg-amber-100 text-amber-800',
  [RiskLevel.HIGH]: 'bg-orange-100 text-orange-800',
  [RiskLevel.CRITICAL]: 'bg-red-100 text-red-800',
}

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level] ?? 'bg-slate-100 text-slate-800'}`}
    >
      {level}
    </span>
  )
}
