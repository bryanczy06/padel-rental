import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import QRScanner from '../../components/QRScanner'
import Spinner from '../../components/Spinner'
import {
  CheckCircle2, User, CircleDot, ChevronRight,
  Search, ArrowRight, AlertTriangle, Star, Home, ScanLine
} from 'lucide-react'

const STEP = { CUSTOMER: 1, CHECKIN: 2, RACKET: 3, CONFIRM: 4, DONE: 5 }

export default function RentFlow() {
  const { t }                    = useTranslation()
  const { profile, activeClub }  = useAuth()
  const navigate                 = useNavigate()
  const toast                    = useToast()

  const [step, setStep]               = useState(STEP.CUSTOMER)
  const [customer, setCustomer]       = useState(null)
  const [racket, setRacket]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [searchRes, setSearchRes]     = useState([])
  const [searching, setSearching]     = useState(false)
  const [showSearch, setShowSearch]   = useState(false)
  const [damagedWarn, setDamagedWarn] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)

  async function checkAndSetCustomer(data) {
    const clubId = activeClub?.id || profile?.club_id

    // בדוק השכרה פתוחה
    const { data: active } = await supabase.from('rentals').select('id')
      .eq('customer_id', data.id).is('returned_at', null).limit(1)
    if (active?.length) {
      setError('ללקוח זה יש כבר מחבט מושכר / This customer already has an active rental')
      return
    }

    // צ׳ק אין אוטומטי: +5 נקודות + רישום
    const newPoints = (data.points || 0) + 5
    await Promise.all([
      supabase.from('customers').update({ points: newPoints }).eq('id', data.id),
      supabase.from('checkins').insert({ club_id: clubId, customer_id: data.id, checked_in_by: profile.id }),
    ])
    const updatedCustomer = { ...data, points: newPoints }
    setCustomer(updatedCustomer)
    setEarnedPoints(5)

    // בדוק מחבט שבור בעבר
    const q = supabase.from('rentals').select('id').eq('customer_id', data.id).eq('condition', 'damaged')
    const { data: dmg } = clubId ? await q.eq('club_id', clubId).limit(1) : await q.limit(1)
    if (dmg?.length) { setDamagedWarn(true) } else { setStep(STEP.CHECKIN) }
    setError('')
  }

  async function handleCustomerQR(code) {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').eq('qr_code', code).single()
    setLoading(false)
    if (!data) { setError('לא נמצא לקוח / Customer not found'); return }
    await checkAndSetCustomer(data)
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    const q = `%${search}%`
    const { data } = await supabase.from('customers').select('*')
      .or(`full_name.ilike.${q},phone.ilike.${q},email.ilike.${q}`)
      .limit(10)
    setSearchRes(data || [])
    setSearching(false)
  }

  async function handleRacketQR(code) {
    setLoading(true)
    const { data } = await supabase.from('rackets').select('*').eq('qr_code', code).single()
    setLoading(false)
    if (!data) { setError('לא נמצא מחבט / Racket not found'); return }
    if (data.status !== 'available') {
      setError(data.status === 'rented' ? t('rent.alreadyRented') : t('rent.notAvailable'))
      return
    }
    setRacket(data)
    setStep(STEP.CONFIRM)
    setError('')
  }

  async function confirmRental() {
    setLoading(true)
    const { error: err } = await supabase.from('rentals').insert({
      club_id:     activeClub?.id || profile.club_id,
      customer_id: customer.id,
      racket_id:   racket.id,
      rented_by:   profile.id,
    })
    if (!err) {
      await supabase.from('rackets').update({ status: 'rented', usage_count: racket.usage_count + 1 })
        .eq('id', racket.id)
      // +10 נקודות על השכרה
      const newPoints = (customer.points || 0) + 10
      await supabase.from('customers').update({ points: newPoints }).eq('id', customer.id)
      setCustomer(c => ({ ...c, points: newPoints }))
      setEarnedPoints(p => p + 10)
    }
    setLoading(false)
    if (err) { setError(err.message); return }
    toast(t('rent.success'))
    setStep(STEP.DONE)
  }

  function reset() {
    setStep(STEP.CUSTOMER)
    setCustomer(null)
    setRacket(null)
    setError('')
    setSearch('')
    setSearchRes([])
    setShowSearch(false)
    setEarnedPoints(0)
  }

  return (
    <Layout>
      {/* אזהרת מחבט שבור */}
      {damagedWarn && customer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">שים לב!</h2>
              <p className="text-gray-600 mt-1">
                <span className="font-semibold">{customer.full_name}</span> החזיר בעבר מחבט שבור.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDamagedWarn(false); setCustomer(null); setStep(STEP.CUSTOMER) }}
                className="btn-secondary flex-1">ביטול</button>
              <button onClick={() => { setDamagedWarn(false); setStep(STEP.CHECKIN) }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors">
                המשך בכל זאת
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/staff')} className="btn-secondary p-2">
            <ChevronRight size={18} className="rtl-flip" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">סריקת לקוח</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        {/* שלב 1: סריקת לקוח */}
        {step === STEP.CUSTOMER && (
          <div className="card flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <User size={18} className="text-brand-600" /> {t('rent.scanCustomer')}
            </h2>
            {loading ? <Spinner /> : <QRScanner onResult={handleCustomerQR} />}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{t('common.or')}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button onClick={() => setShowSearch(s => !s)} className="btn-secondary w-full">
              <Search size={16} /> {t('rent.searchCustomer')}
            </button>
            {showSearch && (
              <div className="flex flex-col gap-3">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    className="input flex-1" placeholder={t('rent.searchCustomer')} />
                  <button type="submit" className="btn-primary">{searching ? '...' : <Search size={16} />}</button>
                </form>
                {searchRes.map(c => (
                  <button key={c.id} onClick={() => checkAndSetCustomer(c)}
                    className="card text-start hover:border-brand-200 border border-transparent transition-colors">
                    <p className="font-medium text-gray-900">{c.full_name}</p>
                    <p className="text-sm text-gray-500">{c.phone || c.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* שלב 2: צ׳ק אין הושלם — בחר המשך */}
        {step === STEP.CHECKIN && customer && (
          <div className="flex flex-col gap-4">
            {/* כרטיס לקוח + נקודות */}
            <div className="card flex flex-col items-center gap-3 py-6 text-center border-brand-200 border-2">
              <div className="h-14 w-14 rounded-full bg-brand-50 flex items-center justify-center">
                <User size={28} className="text-brand-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{customer.full_name}</p>
                <p className="text-sm text-green-600 font-medium mt-0.5">✓ צ׳ק אין הושלם</p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-2">
                <Star size={16} className="text-amber-500 fill-amber-400" />
                <span className="text-sm font-semibold text-amber-700">+5 נקודות</span>
                <span className="text-xs text-amber-600">· סה״כ {customer.points}</span>
              </div>
            </div>

            {/* אפשרויות המשך */}
            <button onClick={() => { setStep(STEP.RACKET); setError('') }}
              className="card flex items-center gap-4 py-5 border-2 border-brand-100 hover:border-brand-400 hover:shadow-md transition-all text-start">
              <div className="h-12 w-12 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                <ScanLine size={22} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">סרוק מחבט להשכרה</p>
                <p className="text-xs text-gray-500 mt-0.5">+10 נקודות נוספות</p>
              </div>
            </button>

            <button onClick={() => navigate('/staff')}
              className="card flex items-center gap-4 py-5 border-2 border-gray-100 hover:border-gray-300 hover:shadow-md transition-all text-start">
              <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Home size={22} className="text-gray-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">סיום — ללא השכרה</p>
                <p className="text-xs text-gray-500 mt-0.5">הלקוח לא צריך מחבט</p>
              </div>
            </button>
          </div>
        )}

        {/* שלב 3: סריקת מחבט */}
        {step === STEP.RACKET && (
          <div className="flex flex-col gap-4">
            <div className="card flex items-center gap-3 border-brand-200 border">
              <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center">
                <User size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('rent.customerFound')}</p>
                <p className="font-semibold text-gray-900">{customer.full_name}</p>
              </div>
              <CheckCircle2 size={20} className="text-brand-600 ms-auto" />
            </div>
            <div className="card flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CircleDot size={18} className="text-brand-600" /> {t('rent.scanRacket')}
              </h2>
              {loading ? <Spinner /> : <QRScanner onResult={handleRacketQR} large />}
            </div>
            <button onClick={() => setStep(STEP.CHECKIN)} className="btn-secondary w-full">
              {t('common.back')}
            </button>
          </div>
        )}

        {/* שלב 4: אישור */}
        {step === STEP.CONFIRM && (
          <div className="flex flex-col gap-4">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('rent.confirm')}</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">{t('history.customer')}</p>
                    <p className="font-medium">{customer.full_name}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-400 mx-auto rtl-flip" />
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <CircleDot size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">{t('history.racket')}</p>
                    <p className="font-medium">{racket.name}</p>
                    {racket.brand && <p className="text-xs text-gray-400">{racket.brand}</p>}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={confirmRental} disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? t('common.loading') : t('rent.confirm')}
            </button>
            <button onClick={() => setStep(STEP.RACKET)} className="btn-secondary w-full">
              {t('common.back')}
            </button>
          </div>
        )}

        {/* שלב 5: סיום */}
        {step === STEP.DONE && (
          <div className="card flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">{t('rent.success')}</p>
              <p className="text-sm text-gray-500 mt-1">{customer.full_name} · {racket.name}</p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-2.5">
              <Star size={16} className="text-amber-500 fill-amber-400" />
              <span className="text-sm font-semibold text-amber-700">+{earnedPoints} נקודות הושלם</span>
              <span className="text-xs text-amber-600">· סה״כ {customer.points}</span>
            </div>
            <button onClick={reset} className="btn-primary w-full">סרוק לקוח נוסף</button>
            <button onClick={() => navigate('/staff')} className="btn-secondary w-full">
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
