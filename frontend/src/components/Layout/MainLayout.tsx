import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useCan } from '@/lib/useCan'
import { Permission } from '@shared'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const canManageUsers = useCan(Permission.USER_MANAGE)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-56 border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center border-b border-slate-200 px-4">
          <span className="font-semibold text-slate-800">Cyber GRC</span>
        </div>
        <nav className="p-2">
          <Link
            to="/suppliers"
            className="block cursor-pointer rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            Suppliers
          </Link>
          {canManageUsers && (
            <Link
              to="/users"
              className="block cursor-pointer rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              Users
            </Link>
          )}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-slate-600">
                {user.firstName} {user.lastName} · {user.organizationName}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer text-sm text-slate-600 hover:text-slate-900"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="relative flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
