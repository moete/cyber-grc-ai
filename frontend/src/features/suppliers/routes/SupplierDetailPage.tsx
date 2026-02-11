import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getSupplier, deleteSupplier } from '@/features/suppliers/api/suppliersApi'
import { listAuditLogs } from '@/features/suppliers/api/auditLogsApi'
import { RiskLevelBadge } from '@/components/RiskLevelBadge'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import { MainLayout } from '@/components/Layout/MainLayout'
import { RequirePermission, useCan } from '@/lib/authorization'
import { toast } from 'sonner'
import { ENTITY_TYPES, Permission } from '@shared'

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: supplierRes,
    isPending: supplierPending,
    isError: supplierError,
    error: supplierErr,
  } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: Boolean(id),
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
                <dd className="flex items-center gap-2">
                  <AiStatusBadge status={supplier.aiStatus} />
                  {supplier.aiRiskScore != null && (
                    <span className="text-slate-600">Score: {supplier.aiRiskScore}</span>
                  )}
                  {supplier.aiError && (
                    <span className="text-sm text-red-600" title={supplier.aiError}>
                      {supplier.aiError.slice(0, 60)}…
                    </span>
                  )}
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
                  {auditLogs.map((log: { id: string; action: string; createdAt: string }) => (
                    <li key={log.id} className="flex gap-3 border-l-2 border-slate-200 pl-3">
                      <span className="text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className="font-medium text-slate-700">{log.action}</span>
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
