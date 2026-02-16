import { useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getSupplier, deleteSupplier } from '@/features/suppliers/api/suppliersApi'
import { listAuditLogs } from '@/features/suppliers/api/auditLogsApi'
import { RiskLevelBadge } from '@/components/RiskLevelBadge'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import { MainLayout } from '@/components/Layout/MainLayout'
import { RequirePermission } from '@/lib/authorization'
import { useCan } from '@/lib/useCan'
import { toast } from 'sonner'
import { ENTITY_TYPES, Permission, AiAnalysisStatus } from '@shared'
import type { IAuditLog, IAiAnalysis } from '@shared'

const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 60_000

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pollingStartedRef = useRef<number | null>(null)

  const {
    data: supplierRes,
    isPending: supplierPending,
    isError: supplierError,
    error: supplierErr,
  } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.aiStatus
      if (status !== AiAnalysisStatus.PENDING && status !== AiAnalysisStatus.PROCESSING) {
        pollingStartedRef.current = null
        return false
      }
      const now = Date.now()
      if (pollingStartedRef.current === null) pollingStartedRef.current = now
      if (now - pollingStartedRef.current > POLL_TIMEOUT_MS) return false
      return POLL_INTERVAL_MS
    },
  })

  const canViewAudit = useCan(Permission.AUDIT_READ)
  const { data: auditRes } = useQuery({
    queryKey: ['audit-logs', ENTITY_TYPES.SUPPLIER, id],
    queryFn: () =>
      listAuditLogs({
        entityType: ENTITY_TYPES.SUPPLIER,
        entityId: id!,
        limit: 50,
      }),
    enabled: Boolean(id) && canViewAudit,
  })

  const supplier = supplierRes?.data
  const auditLogs = auditRes?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted')
      navigate('/suppliers')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleDelete = () => {
    if (!supplier || !window.confirm(`Delete supplier "${supplier.name}"?`)) return
    deleteMutation.mutate(supplier.id)
  }

  if (supplierPending || !id) {
    return (
      <MainLayout>
        <div className="text-slate-500">Loading…</div>
      </MainLayout>
    )
  }

  if (supplierError || !supplier) {
    return (
      <MainLayout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {supplierErr instanceof Error ? supplierErr.message : 'Supplier not found'}
        </div>
        <Link to="/suppliers" className="mt-4 text-indigo-600 hover:underline">
          ← Back to list
        </Link>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/suppliers" className="text-sm text-indigo-600 hover:underline">
              ← Suppliers
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{supplier.name}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/suppliers/${supplier.id}/edit`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Edit
            </Link>
            <RequirePermission permission={Permission.SUPPLIER_DELETE}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </RequirePermission>
          </div>
        </div>

        <div className={`grid gap-6 ${canViewAudit ? 'lg:grid-cols-2' : ''}`}>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500">Details</h2>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs text-slate-400">Domain</dt>
                <dd className="text-slate-900">{supplier.domain}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Category</dt>
                <dd>{supplier.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Risk level</dt>
                <dd>
                  <RiskLevelBadge level={supplier.riskLevel} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Status</dt>
                <dd>{supplier.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">AI analysis</dt>
                <dd className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <AiStatusBadge status={supplier.aiStatus} />
                    {supplier.aiRiskScore != null && (
                      <span className="text-slate-600">Score: {supplier.aiRiskScore}/100</span>
                    )}
                    {(supplier.aiStatus === AiAnalysisStatus.PENDING || supplier.aiStatus === AiAnalysisStatus.PROCESSING) && (
                      <span className="text-xs text-slate-500">Checking every 5s (stops after 1 min)…</span>
                    )}
                    {supplier.aiError && (
                      <span className="text-sm text-red-600" title={supplier.aiError}>
                        {supplier.aiError.slice(0, 60)}{supplier.aiError.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </div>
                  {supplier.aiStatus === AiAnalysisStatus.COMPLETE && supplier.aiAnalysis && (() => {
                    const a = supplier.aiAnalysis as unknown as IAiAnalysis | null
                    if (!a) return null
                    return (
                      <div className="mt-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm">
                        {typeof a.summary === 'string' && (
                          <p className="text-slate-700">{a.summary}</p>
                        )}
                        {Array.isArray(a.riskFactors) && a.riskFactors.length > 0 && (
                          <div>
                            <h4 className="mb-1 font-medium text-slate-600">Risk factors</h4>
                            <ul className="list-inside list-disc space-y-1 text-slate-600">
                              {a.riskFactors.map((f, i) => (
                                <li key={i}>
                                  <span className="font-medium text-slate-700">{f.factor}</span>
                                  {f.riskLevel && (
                                    <span className="ml-1 text-xs text-slate-500">({f.riskLevel})</span>
                                  )}
                                  {f.description && ` — ${f.description}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(a.recommendations) && a.recommendations.length > 0 && (
                          <div>
                            <h4 className="mb-1 font-medium text-slate-600">Recommendations</h4>
                            <ul className="list-inside list-disc space-y-1 text-slate-600">
                              {a.recommendations.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(a.modelVersion || a.analyzedAt) && (
                          <p className="text-xs text-slate-400">
                            {a.modelVersion && <span>Model: {a.modelVersion}</span>}
                            {a.modelVersion && a.analyzedAt && ' · '}
                            {a.analyzedAt && (
                              <span>Analyzed: {new Date(a.analyzedAt).toLocaleString()}</span>
                            )}
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </dd>
              </div>
              {supplier.contractEndDate && (
                <div>
                  <dt className="text-xs text-slate-400">Contract end</dt>
                  <dd>{new Date(supplier.contractEndDate).toLocaleDateString()}</dd>
                </div>
              )}
              {supplier.notes && (
                <div>
                  <dt className="text-xs text-slate-400">Notes</dt>
                  <dd className="text-slate-700 whitespace-pre-wrap">{supplier.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <RequirePermission permission={Permission.AUDIT_READ}>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-medium text-slate-500">Audit timeline</h2>
              {Array.isArray(auditLogs) && auditLogs.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {auditLogs.map((log: IAuditLog) => (
                    <li key={log.id} className="flex flex-col gap-1 border-l-2 border-slate-200 pl-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {new Date(log.createdAt as string | Date).toLocaleString()}
                        </span>
                        <span className="font-medium text-slate-700">{log.action}</span>
                      </div>
                      {log.ipAddress && (
                        <span className="text-xs text-slate-400">IP: {log.ipAddress}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No audit entries yet.</p>
              )}
            </div>
          </RequirePermission>
        </div>
      </div>
    </MainLayout>
  )
}
