import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/features/auth'
import {
  SupplierListPage,
  SupplierDetailPage,
  SupplierFormPage,
} from '@/features/suppliers'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/suppliers" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/suppliers',
    element: (
      <ProtectedRoute>
        <SupplierListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/suppliers/new',
    element: (
      <ProtectedRoute>
        <SupplierFormPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/suppliers/:id',
    element: (
      <ProtectedRoute>
        <SupplierDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/suppliers/:id/edit',
    element: (
      <ProtectedRoute>
        <SupplierFormPage />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to="/suppliers" replace /> },
])
