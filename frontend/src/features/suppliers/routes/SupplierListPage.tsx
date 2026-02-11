import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { listSuppliers, deleteSupplier } from '@/features/suppliers/api/suppliersApi'
import { RiskLevelBadge } from '@/components/RiskLevelBadge'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import { MainLayout } from '@/components/Layout/MainLayout'
import { RequirePermission } from '@/lib/authorization'
import { toast } from 'sonner'
import type { ISupplier } from '@shared'
import { Permission, RiskLevel } from '@shared'

export function SupplierListPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [riskLevel, setRiskLevel] = useState<string>('')

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['suppliers', page, name, riskLevel],
    queryFn: () =>
      listSuppliers({
        page,
        limit: 10,
        name: name || undefined,
        riskLevel: riskLevel || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return
    deleteMutation.mutate(id)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
          <Link
            to="/suppliers/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add supplier
          </Link>
        </div>

        <div className="flex flex-wrap gap-4">
          <input
            type="search"
            placeholder="Search by name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All risk levels</option>
            {(Object.values(RiskLevel) as RiskLevel[]).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {isPending && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading…
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error instanceof Error ? error.message : 'Failed to load suppliers'}
          </div>
        )}
        {data && (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      Risk
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      AI status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.data.map((s: ISupplier) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/suppliers/${s.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.domain}</td>
                      <td className="px-4 py-3 text-slate-600">{s.category}</td>
                      <td className="px-4 py-3">
                        <RiskLevelBadge level={s.riskLevel} />
                      </td>
                      <td className="px-4 py-3">
                        <AiStatusBadge status={s.aiStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/suppliers/${s.id}/edit`}
                          className="mr-3 text-sm text-indigo-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <RequirePermission permission={Permission.SUPPLIER_DELETE}>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={deleteMutation.isPending}
                            className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </RequirePermission>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Page {data.meta.page} of {data.meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
