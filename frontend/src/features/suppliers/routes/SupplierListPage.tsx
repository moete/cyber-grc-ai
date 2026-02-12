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
import { Permission, RiskLevel, Category, Status } from '@shared'

type SortKey = 'name' | 'domain' | 'category' | 'riskLevel' | 'status' | 'createdAt' | 'aiRiskScore'
type SortOrder = 'asc' | 'desc'

export function SupplierListPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [riskLevel, setRiskLevel] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortKey>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['suppliers', page, name, riskLevel, category, status, sortBy, sortOrder],
    queryFn: () =>
      listSuppliers({
        page,
        limit: 10,
        name: name || undefined,
        riskLevel: riskLevel || undefined,
        category: category || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      }),
  })

  function handleSort(column: SortKey) {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setPage(1)
  }

  function clearFilters() {
    setName('')
    setRiskLevel('')
    setCategory('')
    setStatus('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPage(1)
  }

  const hasActiveFilters = name || riskLevel || category || status

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
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add supplier
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            placeholder="Search by name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {(Object.values(Category) as string[]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {(Object.values(Status) as string[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-sm text-slate-600 underline hover:text-slate-900"
            >
              Clear filters
            </button>
          )}
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
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="flex cursor-pointer items-center gap-1 hover:text-slate-700"
                        title="Sort by name"
                      >
                        Name
                        <span className="text-slate-400" aria-hidden>
                          {sortBy === 'name' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleSort('domain')}
                        className="flex cursor-pointer items-center gap-1 hover:text-slate-700"
                        title="Sort by domain"
                      >
                        Domain
                        <span className="text-slate-400" aria-hidden>
                          {sortBy === 'domain' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleSort('category')}
                        className="flex cursor-pointer items-center gap-1 hover:text-slate-700"
                        title="Sort by category"
                      >
                        Category
                        <span className="text-slate-400" aria-hidden>
                          {sortBy === 'category' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleSort('riskLevel')}
                        className="flex cursor-pointer items-center gap-1 hover:text-slate-700"
                        title="Sort by risk level"
                      >
                        Risk
                        <span className="text-slate-400" aria-hidden>
                          {sortBy === 'riskLevel' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleSort('aiRiskScore')}
                        className="flex cursor-pointer items-center gap-1 hover:text-slate-700"
                        title="Sort by AI score"
                      >
                        AI status
                        <span className="text-slate-400" aria-hidden>
                          {sortBy === 'aiRiskScore' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </button>
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
                          className="cursor-pointer font-medium text-indigo-600 hover:underline"
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
                          className="mr-3 cursor-pointer text-sm text-indigo-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <RequirePermission permission={Permission.SUPPLIER_DELETE}>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={deleteMutation.isPending}
                            className="cursor-pointer text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
