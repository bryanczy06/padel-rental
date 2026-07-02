import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import { Building2 } from 'lucide-react'
import RacktiveLogo from './components/RacktiveLogo'

function BranchPicker() {
  const { profile, activeClub, availableClubs, switchClub, loading } = useAuth()
  if (loading || !profile || activeClub || availableClubs.length <= 1) return null
  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-200">
            <RacktiveLogo size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">באיזה סניף אתה היום?</h1>
          <p className="text-sm text-gray-500 mt-1">שלום {profile.full_name}, בחר סניף להמשך</p>
        </div>
        <div className="flex flex-col gap-3">
          {availableClubs.map(club => (
            <button key={club.id} onClick={() => switchClub(club)}
              className="card text-start hover:border-brand-300 border-2 border-transparent transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{club.name}</p>
                  {!club.active && <p className="text-xs text-red-400">מושבת</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

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
import MyQR           from './pages/customer/MyQR'
import SuperDashboard  from './pages/super/SuperDashboard'

const ADMIN = ['admin', 'super_admin', 'owner']
const ALL   = ['admin', 'super_admin', 'owner', 'staff']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <BranchPicker />
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
            <Route path="/my-qr" element={<MyQR />} />

            {/* Super admin */}
            <Route path="/super" element={
              <ProtectedRoute roles={['super_admin']}><SuperDashboard /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
