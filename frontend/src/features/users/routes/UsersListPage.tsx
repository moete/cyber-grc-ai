import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type IUserPublic,
  type UpdateUserBody,
  type CreateUserBody,
} from '@/features/users/api/usersApi'
import { deleteCurrentOrganisation } from '@/features/users/api/organisationsApi'
import { MainLayout } from '@/components/Layout/MainLayout'
import { RequirePermission } from '@/lib/authorization'
import { useAuthStore, type AuthState } from '@/stores/auth'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Permission } from '@shared'
import {
  AddUserModal,
  EditUserModal,
  DeleteOrgModal,
  UsersTable,
} from '@/features/users/components'

export function UsersListPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s: AuthState) => s.user)
  const logout = useAuthStore((s: AuthState) => s.logout)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<IUserPublic | null>(null)
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers(),
  })

  const createMu = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
      setShowAddModal(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserBody }) => updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditingUser(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteUserMu = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User removed')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteOrgMu = useMutation({
    mutationFn: deleteCurrentOrganisation,
    onSuccess: () => {
      toast.success('Organisation deleted')
      logout()
      navigate('/login', { replace: true })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const users: IUserPublic[] = data?.data ?? []

  function handleDeleteUser(user: IUserPublic) {
    if (window.confirm(`Remove ${user.firstName} ${user.lastName} from the organisation? This cannot be undone.`)) {
      deleteUserMu.mutate(user.id)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <RequirePermission permission={Permission.USER_MANAGE}>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add user
            </button>
          </RequirePermission>
        </div>

        {showAddModal && (
          <AddUserModal
            onClose={() => setShowAddModal(false)}
            onSubmit={(body: CreateUserBody) => createMu.mutate(body)}
            isSubmitting={createMu.isPending}
          />
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={(body: UpdateUserBody) => updateMu.mutate({ id: editingUser.id, body })}
            isSubmitting={updateMu.isPending}
          />
        )}

        {showDeleteOrgModal && (
          <DeleteOrgModal
            organisationName={currentUser?.organizationName ?? ''}
            onClose={() => setShowDeleteOrgModal(false)}
            onConfirm={() => deleteOrgMu.mutate()}
            isSubmitting={deleteOrgMu.isPending}
          />
        )}

        {isPending && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading…
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error instanceof Error ? error.message : 'Failed to load users'}
          </div>
        )}
        {data && (
          <UsersTable
            users={users}
            currentUserId={currentUser?.id}
            onEdit={setEditingUser}
            onToggleActive={(id, isActive) => updateMu.mutate({ id, body: { isActive } })}
            onDelete={handleDeleteUser}
            isUpdating={updateMu.isPending}
            isDeleting={deleteUserMu.isPending}
          />
        )}

        <RequirePermission permission={Permission.ORG_DELETE}>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-6">
            <h2 className="text-sm font-medium text-red-800">Danger zone</h2>
            <p className="mt-1 text-sm text-red-700">
              Deleting this organisation will permanently remove all users, suppliers and audit logs. You will be
              logged out.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteOrgModal(true)}
              disabled={deleteOrgMu.isPending}
              className="mt-3 cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete this organisation
            </button>
          </div>
        </RequirePermission>
      </div>
    </MainLayout>
  )
}
