import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import Layout from '../../components/Layout'
import Spinner from '../../components/Spinner'
import { CircleDot, Users, Clock, TrendingUp, AlertTriangle, Phone, Banknote } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { t }                    = useTranslation()
  const { profile, activeClub }  = useAuth()
  const [stats, setStats]     = useState(null)
  const [overdue, setOverdue] = useState([])
  const [chartData, setChart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeClub?.id) return
    setLoading(true)
    async function load() {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const [racketRes, rentalRes, todayRes, monthRes, totalRes] = await Promise.all([
        supabase.from('rackets').select('status').eq('club_id', activeClub.id),
        supabase.from('rentals').select('id, started_at, rackets(name), customers(full_name, phone)')
          .eq('club_id', activeClub.id).is('returned_at', null),
        supabase.from('rentals').select('id').eq('club_id', activeClub.id)
          .gte('started_at', new Date().toISOString().slice(0, 10)),
        supabase.from('rentals').select('id', { count: 'exact', head: true })
          .eq('club_id', activeClub.id).gte('started_at', monthStart),
        supabase.from('rentals').select('id', { count: 'exact', head: true })
          .eq('club_id', activeClub.id),
      ])

      const rackets = racketRes.data || []
      const open    = rentalRes.data || []

      const price = activeClub?.price_per_rental ?? null
      setStats({
        available:    rackets.filter(r => r.status === 'available').length,
        rented:       rackets.filter(r => r.status === 'rented').length,
        repair:       rackets.filter(r => r.status === 'repair').length,
        today:        todayRes.data?.length || 0,
        monthCount:   monthRes.count || 0,
        totalCount:   totalRes.count || 0,
        price,
      })

      const TWO_HOURS = 2 * 60 * 60 * 1000
      setOverdue(open.filter(r => Date.now() - new Date(r.started_at) > TWO_HOURS))

      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        days.push({ date: d.toLocaleDateString('he-IL', { weekday: 'short' }), key })
      }
      const weekRes = await supabase.from('rentals').select('started_at')
        .eq('club_id', activeClub.id)
        .gte('started_at', days[0].key)
      const counts = {}
      ;(weekRes.data || []).forEach(r => {
        const k = r.started_at.slice(0, 10)
        counts[k] = (counts[k] || 0) + 1
      })
      setChart(days.map(d => ({ name: d.date, rentals: counts[d.key] || 0 })))
      setLoading(false)
    }
    load()
  }, [activeClub?.id])

  if (loading) return <Layout><Spinner /></Layout>

  const statCards = [
    { label: t('dashboard.rentedNow'), value: stats.rented,    icon: CircleDot,    color: 'text-brand-600',  bg: 'bg-brand-50'  },
    { label: t('dashboard.available'), value: stats.available, icon: CircleDot,    color: 'text-gray-600',   bg: 'bg-gray-100'  },
    { label: t('dashboard.inRepair'),  value: stats.repair,    icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50'  },
    { label: t('dashboard.todayRentals'), value: stats.today,  icon: TrendingUp,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
  ]

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-gray-500 text-sm">{t('dashboard.welcome')},</p>
          <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h1>
          {activeClub && <p className="text-sm text-gray-400 mt-0.5">{activeClub.name}</p>}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card flex flex-col gap-2">
              <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Revenue cards */}
        {stats.price != null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex flex-col gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Banknote size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₪{(stats.monthCount * stats.price).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 leading-tight">הכנסות החודש</p>
            </div>
            <div className="card flex flex-col gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Banknote size={18} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₪{(stats.totalCount * stats.price).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 leading-tight">סך הכל הכנסות</p>
            </div>
          </div>
        )}

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div className="card border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <p className="font-semibold text-amber-700">{t('dashboard.overdueAlert')} ({overdue.length})</p>
            </div>
            <div className="flex flex-col gap-2">
              {overdue.map(r => {
                const hrs = ((Date.now() - new Date(r.started_at)) / 3600000).toFixed(1)
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2 bg-white rounded-xl">
                    <CircleDot size={14} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.customers?.full_name}</p>
                      <p className="text-xs text-gray-400">{r.rackets?.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 shrink-0">
                      <Clock size={12} /> {hrs}ש׳
                    </span>
                    {r.customers?.phone && (
                      <a href={`tel:${r.customers.phone}`}
                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors shrink-0">
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">השכרות — 7 ימים אחרונים</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 24px #0002', fontSize: 13 }}
                cursor={{ fill: '#f0fdf4' }}
              />
              <Bar dataKey="rentals" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  )
}
