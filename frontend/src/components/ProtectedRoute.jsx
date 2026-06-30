import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children, roles }) {
  const { profile, loading } = useAuth()

  if (loading) return <Spinner fullscreen />

  if (!profile) return <Navigate to="/login" replace />

  if (roles && !roles.includes(profile.role))
    return <Navigate to="/staff" replace />

  return children
}
