import { AiAnalysisStatus } from '@shared'

const styles: Record<AiAnalysisStatus, string> = {
  [AiAnalysisStatus.PENDING]: 'bg-slate-100 text-slate-600',
  [AiAnalysisStatus.PROCESSING]: 'bg-blue-100 text-blue-700',
  [AiAnalysisStatus.COMPLETE]: 'bg-emerald-100 text-emerald-700',
  [AiAnalysisStatus.ERROR]: 'bg-red-100 text-red-700',
}

const labels: Record<AiAnalysisStatus, string> = {
  [AiAnalysisStatus.PENDING]: 'Pending',
  [AiAnalysisStatus.PROCESSING]: 'Processing',
  [AiAnalysisStatus.COMPLETE]: 'Complete',
  [AiAnalysisStatus.ERROR]: 'Error',
}

export function AiStatusBadge({ status }: { status: AiAnalysisStatus | null }) {
  if (status == null) return <span className="text-slate-400 text-sm">—</span>
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {labels[status]}
    </span>
  )
}
