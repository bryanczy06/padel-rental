import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/auth'
import LanguageToggle from './LanguageToggle'
import {
  LayoutDashboard, CircleDot, Users, UserCog,
  ClipboardList, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const location   = useLocation()
  const navigate   = useNavigate()
  const [open, setOpen] = useState(false)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const adminLinks = [
    { to: '/admin',          label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/admin/rackets',  label: t('nav.rackets'),   icon: CircleDot },
    { to: '/admin/customers',label: t('nav.customers'), icon: Users },
    { to: '/admin/staff',    label: t('nav.staff'),     icon: UserCog },
    { to: '/admin/history',  label: t('nav.history'),   icon: ClipboardList },
  ]

  const staffLinks = [
    { to: '/staff',          label: t('nav.dashboard'), icon: LayoutDashboard },
  ]

  const links = isAdmin ? adminLinks : staffLinks

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const active = (to) =>
    location.pathname === to ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-e border-gray-100 p-4 fixed top-0 start-0 z-30">
        <div className="flex items-center gap-2 px-2 mb-8 mt-2">
          <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center">
            <CircleDot size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{t('app.name')}</span>
        </div>

        {profile?.clubs && (
          <p className="text-xs text-gray-400 px-3 mb-4 truncate">{profile.clubs.name}</p>
        )}

        <nav className="flex-1 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active(to)}`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
          <LanguageToggle />
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors w-full">
            <LogOut size={16} /> {t('nav.logout')}
          </button>
          <p className="text-xs text-gray-400 px-3 truncate">{profile?.full_name}</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <CircleDot size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">{t('app.name')}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-100">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-20 pt-14">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <nav className="relative bg-white h-full w-64 p-4 flex flex-col gap-1 shadow-xl">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active(to)}`}>
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <div className="mt-auto border-t border-gray-100 pt-4">
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 w-full">
                <LogOut size={16} /> {t('nav.logout')}
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
