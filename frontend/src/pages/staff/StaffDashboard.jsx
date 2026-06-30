import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import Layout from '../../components/Layout'
import { CirclePlus, Undo2, AlertTriangle, Clock, Phone } from 'lucide-react'

export default function StaffDashboard() {
  const { t }                   = useTranslation()
  const { profile, activeClub } = useAuth()
  const [overdue, setOverdue]   = useState([])

  async function loadOverdue() {
    const clubId = activeClub?.id || profile?.club_id
    if (!clubId) return
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('rentals')
      .select('*, customers(full_name, phone), rackets(name)')
      .eq('club_id', clubId)
      .is('returned_at', null)
      .lt('started_at', twoHoursAgo)
    setOverdue(data || [])
  }

  useEffect(() => {
    loadOverdue()
    const interval = setInterval(loadOverdue, 60000)
    return () => clearInterval(interval)
  }, [activeClub?.id, profile?.club_id])

  function elapsed(startedAt) {
    const mins = Math.round((Date.now() - new Date(startedAt)) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}ש׳ ${m}ד׳`
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 max-w-sm mx-auto text-center">
        <div>
          <p className="text-gray-500 text-sm">{t('dashboard.welcome')},</p>
          <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h1>
        </div>

        {overdue.length > 0 && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <AlertTriangle size={16} /> {overdue.length} השכרות מעל שעתיים
            </div>
            {overdue.map(r => (
              <div key={r.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <Clock size={16} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{r.customers?.full_name}</p>
                  <p className="text-xs text-gray-500">{r.rackets?.name} · {elapsed(r.started_at)}</p>
                </div>
                {r.customers?.phone && (
                  <a href={`tel:${r.customers.phone}`}
                    className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors shrink-0">
                    <Phone size={15} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <Link to="/staff/rent"
            className="card flex flex-col items-center gap-3 py-10 border-2 border-brand-100
                       hover:border-brand-400 hover:shadow-md hover:shadow-brand-100
                       transition-all duration-200 cursor-pointer no-underline">
            <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-200">
              <CirclePlus size={28} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{t('dashboard.quickRent')}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('rent.scanCustomer')}</p>
            </div>
          </Link>

          <Link to="/staff/return"
            className="card flex flex-col items-center gap-3 py-10 border-2 border-gray-100
                       hover:border-gray-300 hover:shadow-md
                       transition-all duration-200 cursor-pointer no-underline">
            <div className="h-14 w-14 rounded-2xl bg-gray-800 flex items-center justify-center shadow-md shadow-gray-200">
              <Undo2 size={26} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{t('dashboard.quickReturn')}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('return.scanRacket')}</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
