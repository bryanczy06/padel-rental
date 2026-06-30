import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signIn } from '../lib/auth'
import { CircleDot, Lock, Mail } from 'lucide-react'
import LanguageToggle from '../components/LanguageToggle'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await signIn(email, password)
    if (err) { setLoading(false); setError(err.message || t('auth.error')); return }

    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); setError('לא נמצא משתמש, נסה שוב'); return }
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setLoading(false)
      if (profileErr) { setError('שגיאה בטעינת הפרופיל: ' + profileErr.message); return }
      if (!profile) { setError('פרופיל לא נמצא - פנה למנהל'); return }
      navigate(profile.role === 'staff' ? '/staff' : '/admin')
    } catch (ex) {
      setLoading(false)
      setError('שגיאה: ' + ex.message)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="absolute top-4 end-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200 mb-4">
            <CircleDot size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.name')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.login')}</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute top-3 start-3.5 text-gray-400" />
                <input
                  type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="input ps-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute top-3 start-3.5 text-gray-400" />
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input ps-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
