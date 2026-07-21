import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import Layout from '../../components/Layout'
import Spinner from '../../components/Spinner'
import { CircleDot, Users, Clock, TrendingUp, AlertTriangle, Phone, Banknote, UserPlus, Repeat } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function AdminDashboard() {
  const { t }                    = useTranslation()
  const { profile, activeClub }  = useAuth()
  const [stats, setStats]     = useState(null)
  const [overdue, setOverdue] = useState([])
  const [chartData, setChart] = useState([])
  const [customerSplit, setCustomerSplit] = useState([])
  const [durationChart, setDurationChart]  = useState([])
  const [avgDurationMin, setAvgDurationMin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('7d') // '7d' | '30d' | '12m'

  const PERIODS = [
    { key: '7d',  label: '7 ימים' },
    { key: '30d', label: '30 ימים' },
    { key: '12m', label: '12 חודשים' },
  ]

  function buildBuckets(p) {
    if (p === '12m') {
      const months = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const key = d.toISOString().slice(0, 7) // YYYY-MM
        months.push({ date: d.toLocaleDateString('he-IL', { month: 'short' }), key })
      }
      return { buckets: months, monthly: true }
    }
    const n = p === '30d' ? 29 : 6
    const days = []
    for (let i = n; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: p === '30d' ? d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : d.toLocaleDateString('he-IL', { weekday: 'short' }), key })
    }
    return { buckets: days, monthly: false }
  }

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

      const { buckets, monthly } = buildBuckets(period)
      const sliceLen = monthly ? 7 : 10
      const rangeRes = await supabase.from('rentals').select('started_at')
        .eq('club_id', activeClub.id)
        .gte('started_at', buckets[0].key)
      const counts = {}
      ;(rangeRes.data || []).forEach(r => {
        const k = r.started_at.slice(0, sliceLen)
        counts[k] = (counts[k] || 0) + 1
      })
      setChart(buckets.map(d => ({ name: d.date, rentals: counts[d.key] || 0 })))

      // ── לקוחות חדשים מול חוזרים — לפי התקופה הנבחרת ──
      const periodStart = buckets[0].key
      const { data: periodCheckins } = await supabase.from('checkins')
        .select('customer_id, created_at')
        .eq('club_id', activeClub.id)
        .gte('created_at', periodStart)
      const periodCustomerIds = [...new Set((periodCheckins || []).map(c => c.customer_id))]

      let returningIds = new Set()
      if (periodCustomerIds.length) {
        const { data: priorCheckins } = await supabase.from('checkins')
          .select('customer_id')
          .eq('club_id', activeClub.id)
          .lt('created_at', periodStart)
          .in('customer_id', periodCustomerIds)
        returningIds = new Set((priorCheckins || []).map(c => c.customer_id))
      }
      const newCount = periodCustomerIds.filter(id => !returningIds.has(id)).length
      const returningCount = returningIds.size
      setCustomerSplit([
        { name: 'לקוחות חדשים', value: newCount, fill: '#16a34a' },
        { name: 'לקוחות חוזרים', value: returningCount, fill: '#3b82f6' },
      ])

      // ── זמן השכרה ממוצע ──
      const { data: completedRentals } = await supabase.from('rentals')
        .select('started_at, returned_at')
        .eq('club_id', activeClub.id)
        .not('returned_at', 'is', null)
        .gte('started_at', buckets[0].key)

      const MAX_DURATION_MIN = 3 * 60 // מחבטים שלא הוחזרו תוך 3 שעות (אבדן/גניבה) לא יעוותו את הממוצע
      const durByBucket = {}
      ;(completedRentals || []).forEach(r => {
        const mins = Math.min((new Date(r.returned_at) - new Date(r.started_at)) / 60000, MAX_DURATION_MIN)
        const k = r.started_at.slice(0, sliceLen)
        if (!durByBucket[k]) durByBucket[k] = []
        durByBucket[k].push(mins)
      })
      setDurationChart(buckets.map(d => {
        const arr = durByBucket[d.key] || []
        const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
        return { name: d.date, minutes: avg }
      }))
      const allMins = Object.values(durByBucket).flat()
      setAvgDurationMin(allMins.length ? Math.round(allMins.reduce((a, b) => a + b, 0) / allMins.length) : null)

      setLoading(false)
    }
    load()
  }, [activeClub?.id, period])

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

        {/* Period selector */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1 self-start">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === p.key ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">השכרות — {PERIODS.find(p => p.key === period)?.label} אחרונים</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={period === '30d' ? 12 : 28}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={period === '30d' ? 2 : 0} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 24px #0002', fontSize: 13 }}
                cursor={{ fill: '#f0fdf4' }}
              />
              <Bar dataKey="rentals" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* New vs returning customers */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">לקוחות חדשים מול חוזרים — {PERIODS.find(p => p.key === period)?.label} אחרונים</h2>
          <p className="text-xs text-gray-400 mb-4">חוזר = לקוח שביצע צ׳ק אין גם לפני תחילת התקופה</p>
          {customerSplit.every(s => s.value === 0) ? (
            <p className="text-sm text-gray-400 py-6 text-center">אין נתוני צ׳ק אין בתקופה זו</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180} className="sm:max-w-[180px]">
                <PieChart>
                  <Pie data={customerSplit} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {customerSplit.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 24px #0002', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3 flex-1 w-full">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <UserPlus size={18} className="text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{customerSplit[0]?.value ?? 0}</p>
                    <p className="text-xs text-gray-500">לקוחות חדשים</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Repeat size={18} className="text-blue-600" />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{customerSplit[1]?.value ?? 0}</p>
                    <p className="text-xs text-gray-500">לקוחות חוזרים</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Average rental duration */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">זמן השכרה ממוצע — {PERIODS.find(p => p.key === period)?.label} אחרונים</h2>
            {avgDurationMin != null && (
              <span className="text-sm font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg">
                ממוצע: {avgDurationMin} דק׳
              </span>
            )}
          </div>
          {avgDurationMin == null ? (
            <p className="text-sm text-gray-400 py-6 text-center">אין השכרות שהוחזרו בתקופה זו</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={durationChart} barSize={period === '30d' ? 12 : 28}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={period === '30d' ? 2 : 0} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v} דק׳`, 'ממוצע']}
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 24px #0002', fontSize: 13 }}
                  cursor={{ fill: '#eff6ff' }}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  )
}
