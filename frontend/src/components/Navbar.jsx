import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/auth'
import LanguageToggle from './LanguageToggle'
import {
  LayoutDashboard, CircleDot, Users, UserCog,
  ClipboardList, LogOut, Menu, X, ShieldCheck,
  Building2, ChevronDown
} from 'lucide-react'
import RacktiveLogo from './RacktiveLogo'
import { useState } from 'react'

export default function Navbar() {
  const { t } = useTranslation()
  const { profile, activeClub, availableClubs, switchClub } = useAuth()
  const location   = useLocation()
  const navigate   = useNavigate()
  const [open, setOpen]           = useState(false)
  const [clubPicker, setClubPicker] = useState(false)

  const isAdmin      = ['admin', 'super_admin', 'owner'].includes(profile?.role)
  const isSuperAdmin = profile?.role === 'super_admin'
  const isOwner      = profile?.role === 'owner'
  const canSwitch    = isSuperAdmin || availableClubs.length > 1

  const adminLinks = [
    { to: '/admin',           label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/admin/rackets',   label: t('nav.rackets'),   icon: CircleDot },
    { to: '/admin/customers', label: t('nav.customers'), icon: Users },
    { to: '/admin/staff',     label: t('nav.staff'),     icon: UserCog },
    { to: '/admin/history',   label: t('nav.history'),   icon: ClipboardList },
  ]

  const staffLinks = [
    { to: '/staff', label: t('nav.dashboard'), icon: LayoutDashboard },
  ]

  const links = isAdmin ? adminLinks : staffLinks

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const active = (to) =>
    location.pathname === to ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'

  function ClubSwitcher({ mobile = false }) {
    if (!canSwitch) return null
    return (
      <div className="relative">
        <button
          onClick={() => setClubPicker(p => !p)}
          className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 ${mobile ? 'w-full px-3 py-2.5' : 'px-3 py-2'}`}
        >
          <Building2 size={15} className="text-brand-600 shrink-0" />
          <span className="truncate flex-1 text-start">{activeClub?.name || 'בחר מועדון'}</span>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </button>
        {clubPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setClubPicker(false)} />
            <div className={`absolute z-50 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-48 ${mobile ? 'top-full mt-1 start-0' : 'top-full mt-1 start-0'}`}>
              {availableClubs.map(club => (
                <button key={club.id}
                  onClick={() => { switchClub(club); setClubPicker(false) }}
                  className={`w-full text-start px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${activeClub?.id === club.id ? 'text-brand-700 font-semibold' : 'text-gray-700'}`}
                >
                  <Building2 size={14} className={activeClub?.id === club.id ? 'text-brand-600' : 'text-gray-400'} />
                  {club.name}
                  {!club.active && <span className="ms-auto text-xs text-red-400">מושבת</span>}
                </button>
              ))}
              {isSuperAdmin && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <Link to="/super" onClick={() => setClubPicker(false)}
                    className="w-full text-start px-3 py-2.5 text-sm text-brand-600 font-medium hover:bg-brand-50 transition-colors flex items-center gap-2">
                    <ShieldCheck size={14} /> ניהול מועדונים
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-e border-gray-100 p-4 fixed top-0 start-0 z-30">
        <div className="flex items-center gap-2 px-2 mb-6 mt-2">
          <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center">
            <RacktiveLogo size={18} />
          </div>
          <span className="font-bold text-gray-900 text-lg">{t('app.name')}</span>
          {isSuperAdmin && <ShieldCheck size={14} className="text-brand-400 ms-auto" />}
        </div>

        {/* Club switcher */}
        {canSwitch
          ? <div className="mb-4"><ClubSwitcher /></div>
          : activeClub && (
            <p className="text-xs text-gray-400 px-3 mb-4 truncate">{activeClub.name}</p>
          )
        }

        <nav className="flex-1 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active(to)}`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
          {isSuperAdmin && (
            <Link to="/super"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active('/super')}`}>
              <ShieldCheck size={18} />
              Super Admin
            </Link>
          )}
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
            <RacktiveLogo size={15} />
          </div>
          <span className="font-bold text-gray-900">{t('app.name')}</span>
        </div>
        <div className="flex items-center gap-2">
          {canSwitch && <ClubSwitcher />}
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
            {!canSwitch && activeClub && (
              <p className="text-xs text-gray-400 px-3 mb-2 truncate">{activeClub.name}</p>
            )}
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active(to)}`}>
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {isSuperAdmin && (
              <Link to="/super" onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${active('/super')}`}>
                <ShieldCheck size={18} />
                Super Admin
              </Link>
            )}
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
