import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children, roles }) {
  const { profile, loading } = useAuth()

  if (loading) return <Spinner fullscreen />

  if (!profile) return <Navigate to="/login" replace />

  // Super admin is never blocked
  if (profile.role !== 'super_admin' && profile.clubs?.active === false) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-sm text-center flex flex-col items-center gap-4 py-10">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">המועדון מושבת</p>
            <p className="text-sm text-gray-500 mt-1">צור קשר עם מנהל המערכת להפעלה מחדש</p>
          </div>
        </div>
      </div>
    )
  }

  if (roles && !roles.includes(profile.role))
    return <Navigate to="/staff" replace />

  return children
}
