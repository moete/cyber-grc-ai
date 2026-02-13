import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getSupplier, createSupplier, updateSupplier, type CreateSupplierBody } from '@/features/suppliers/api/suppliersApi'
import type { SupplierDetailResponse } from '@/types'
import { MainLayout } from '@/components/Layout/MainLayout'
import { toast } from 'sonner'
import { Category, RiskLevel, Status } from '@shared'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  domain: z.string().min(1, 'Domain is required').max(255),
  category: z.enum([Category.SAAS, Category.INFRASTRUCTURE, Category.CONSULTING, Category.OTHER]),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  status: z.nativeEnum(Status).optional(),
  contractEndDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export function SupplierFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = id && id !== 'new'

  const { data: existing } = useQuery<SupplierDetailResponse>({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: Boolean(id && id !== 'new'),
  })

  const existingSupplier = existing?.data ?? null

  const createMu = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier created')
      navigate('/suppliers')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMu = useMutation({
    mutationFn: ({ id: sid, body }: { id: string; body: CreateSupplierBody }) =>
      updateSupplier(sid, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      if (id) queryClient.invalidateQueries({ queryKey: ['supplier', id] })
      toast.success('Supplier updated')
      navigate('/suppliers')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      domain: '',
      category: Category.OTHER,
      riskLevel: RiskLevel.MEDIUM,
      status: Status.ACTIVE,
      notes: '',
    },
    values: existingSupplier
      ? {
          name: existingSupplier.name,
          domain: existingSupplier.domain,
          category: existingSupplier.category,
          riskLevel: existingSupplier.riskLevel,
          status: existingSupplier.status,
          contractEndDate: existingSupplier.contractEndDate
            ? new Date(existingSupplier.contractEndDate).toISOString().slice(0, 10)
            : '',
          notes: existingSupplier.notes ?? '',
        }
      : undefined,
  })

  const loading = isEdit && !existingSupplier
  const mutating = createMu.isPending || updateMu.isPending

  async function onSubmit(values: FormValues) {
    const body: CreateSupplierBody = {
      name: values.name,
      domain: values.domain,
      category: values.category,
      riskLevel: values.riskLevel,
      status: values.status,
      contractEndDate: values.contractEndDate || null,
      notes: values.notes || null,
    }
    if (isEdit && id) {
      updateMu.mutate({ id, body })
    } else {
      createMu.mutate(body)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-slate-500">Loading…</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          {isEdit ? 'Edit supplier' : 'New supplier'}
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name *</label>
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('name')}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Domain *</label>
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('domain')}
            />
            {errors.domain && <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Category *</label>
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('category')}
            >
              {(Object.values(Category) as string[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Risk level</label>
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('riskLevel')}
            >
              {(Object.values(RiskLevel) as string[]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('status')}
            >
              {(Object.values(Status) as string[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contract end date</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('contractEndDate')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              {...register('notes')}
            />
            {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || mutating}
              className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutating ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
