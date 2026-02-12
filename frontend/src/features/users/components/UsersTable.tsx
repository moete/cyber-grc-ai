import { RequirePermission } from '@/lib/authorization'
import { Permission } from '@shared'
import type { IUserPublic } from '@/types'

export interface UsersTableProps {
  users: IUserPublic[]
  currentUserId: string | undefined
  onEdit: (user: IUserPublic) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete: (user: IUserPublic) => void
  isUpdating: boolean
  isDeleting: boolean
}

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onToggleActive,
  onDelete,
  isUpdating,
  isDeleting,
}: UsersTableProps) {
  const isCurrentUser = (id: string) => currentUserId === id

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Role</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-900">
                {u.firstName} {u.lastName}
              </td>
              <td className="px-4 py-3 text-slate-600">{u.email}</td>
              <td className="px-4 py-3 text-slate-700">{u.role}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <RequirePermission permission={Permission.USER_MANAGE}>
                  <button
                    type="button"
                    onClick={() => onEdit(u)}
                    className="mr-3 cursor-pointer text-sm text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(u.id, !u.isActive)}
                    disabled={isUpdating}
                    className="mr-3 cursor-pointer text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {!isCurrentUser(u.id) && (
                    <button
                      type="button"
                      onClick={() => onDelete(u)}
                      disabled={isDeleting}
                      className="cursor-pointer text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </RequirePermission>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
