import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

import Login           from './pages/Login'
import StaffDashboard  from './pages/staff/StaffDashboard'
import RentFlow        from './pages/staff/RentFlow'
import ReturnFlow      from './pages/staff/ReturnFlow'
import AdminDashboard  from './pages/admin/AdminDashboard'
import Rackets         from './pages/admin/Rackets'
import Customers       from './pages/admin/Customers'
import Staff           from './pages/admin/Staff'
import RentalHistory   from './pages/admin/RentalHistory'
import Join            from './pages/customer/Join'

const ADMIN = ['admin', 'super_admin']
const ALL   = ['admin', 'super_admin', 'staff']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Staff routes */}
            <Route path="/staff" element={
              <ProtectedRoute roles={ALL}><StaffDashboard /></ProtectedRoute>
            } />
            <Route path="/staff/rent" element={
              <ProtectedRoute roles={ALL}><RentFlow /></ProtectedRoute>
            } />
            <Route path="/staff/return" element={
              <ProtectedRoute roles={ALL}><ReturnFlow /></ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute roles={ADMIN}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/rackets" element={
              <ProtectedRoute roles={ADMIN}><Rackets /></ProtectedRoute>
            } />
            <Route path="/admin/customers" element={
              <ProtectedRoute roles={ADMIN}><Customers /></ProtectedRoute>
            } />
            <Route path="/admin/staff" element={
              <ProtectedRoute roles={ADMIN}><Staff /></ProtectedRoute>
            } />
            <Route path="/admin/history" element={
              <ProtectedRoute roles={ADMIN}><RentalHistory /></ProtectedRoute>
            } />

            {/* Customer self-registration */}
            <Route path="/join" element={<Join />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
