import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import Layout from '../../components/Layout'
import Spinner from '../../components/Spinner'
import { Search, ClipboardList, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

export default function RentalHistory() {
  const { t }       = useTranslation()
  const { profile } = useAuth()
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    if (!profile?.club_id) return
    supabase.from('rentals')
      .select('*, customers(full_name, phone), rackets(name, brand), profiles!rentals_rented_by_fkey(full_name)')
      .eq('club_id', profile.club_id)
      .order('started_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setRentals(data || []); setLoading(false) })
  }, [profile])

  const filtered = rentals.filter(r => {
    const q = search.toLowerCase()
    return !q
      || r.customers?.full_name?.toLowerCase().includes(q)
      || r.rackets?.name?.toLowerCase().includes(q)
  })

  function duration(r) {
    const end = r.returned_at ? new Date(r.returned_at) : new Date()
    const mins = Math.round((end - new Date(r.started_at)) / 60000)
    if (mins < 60) return `${mins}${t('history.minutes')}`
    return `${Math.floor(mins / 60)}${t('history.hours')} ${mins % 60}${t('history.minutes')}`
  }

  if (loading) return <Layout><Spinner /></Layout>

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('history.title')}</h1>

        <div className="relative">
          <Search size={16} className="absolute top-3 start-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input ps-9" placeholder={`${t('history.customer')} / ${t('history.racket')}`} />
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map(r => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="shrink-0">
                {!r.returned_at
                  ? <Clock size={18} className="text-amber-500" />
                  : r.condition === 'damaged'
                    ? <AlertTriangle size={18} className="text-red-500" />
                    : <CheckCircle2 size={18} className="text-brand-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 text-sm">{r.customers?.full_name}</p>
                  <span className="text-gray-400 text-xs">→</span>
                  <p className="text-sm text-gray-700">{r.rackets?.name}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(r.started_at).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {r.returned_at && ` · ${duration(r)}`}
                </p>
              </div>
              <div className="shrink-0 text-end">
                {!r.returned_at
                  ? <span className="badge badge-amber">{t('history.open')}</span>
                  : <span className={`badge ${r.condition === 'damaged' ? 'badge-red' : 'badge-green'}`}>
                      {r.condition === 'damaged' ? t('return.damaged') : t('return.good')}
                    </span>}
                <p className="text-xs text-gray-400 mt-1">{duration(r)}</p>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
