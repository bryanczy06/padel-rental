import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import QRScanner from '../../components/QRScanner'
import Spinner from '../../components/Spinner'
import { CheckCircle2, User, CircleDot, ChevronRight, Search, ArrowRight, AlertTriangle } from 'lucide-react'

const STEP = { CUSTOMER: 1, RACKET: 2, CONFIRM: 3, DONE: 4 }

export default function RentFlow() {
  const { t }                    = useTranslation()
  const { profile, activeClub }  = useAuth()
  const navigate                 = useNavigate()
  const toast                    = useToast()

  const [step, setStep]             = useState(STEP.CUSTOMER)
  const [customer, setCustomer]     = useState(null)
  const [racket, setRacket]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [searchRes, setSearchRes]   = useState([])
  const [searching, setSearching]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [damagedWarn, setDamagedWarn] = useState(false)

  async function checkAndSetCustomer(data) {
    const clubId = activeClub?.id || profile?.club_id

    // בדוק אם יש השכרה פתוחה ללקוח
    const { data: active } = await supabase.from('rentals').select('id')
      .eq('customer_id', data.id).is('returned_at', null).limit(1)
    if (active?.length) {
      setError('ללקוח זה יש כבר מחבט מושכר / This customer already has an active rental')
      return
    }

    const q = supabase.from('rentals').select('id').eq('customer_id', data.id).eq('condition', 'damaged')
    const { data: dmg } = clubId ? await q.eq('club_id', clubId).limit(1) : await q.limit(1)
    setCustomer(data)
    if (dmg?.length) { setDamagedWarn(true) } else { setStep(STEP.RACKET) }
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
    }
    setLoading(false)
    if (err) { setError(err.message); return }
    toast(t('rent.success'))
    setStep(STEP.DONE)
  }

  return (
    <Layout>
      {/* Damaged customer warning */}
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
              <button onClick={() => { setDamagedWarn(false); setCustomer(null) }}
                className="btn-secondary flex-1">ביטול</button>
              <button onClick={() => { setDamagedWarn(false); setStep(STEP.RACKET) }}
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
          <h1 className="text-xl font-bold text-gray-900">{t('rent.title')}</h1>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[STEP.CUSTOMER, STEP.RACKET, STEP.CONFIRM].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${step > s ? 'bg-brand-600 text-white' : step === s ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-gray-100 text-gray-400'}`}>
                {step > s ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-brand-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        {/* Step 1: Customer */}
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

        {/* Step 2: Racket */}
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
              {loading ? <Spinner /> : <QRScanner onResult={handleRacketQR} />}
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
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

        {/* Done */}
        {step === STEP.DONE && (
          <div className="card flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">{t('rent.success')}</p>
              <p className="text-sm text-gray-500 mt-1">{customer.full_name} · {racket.name}</p>
            </div>
            <button onClick={() => { setStep(STEP.CUSTOMER); setCustomer(null); setRacket(null) }}
              className="btn-primary w-full">
              {t('dashboard.quickRent')}
            </button>
            <button onClick={() => navigate('/staff')} className="btn-secondary w-full">
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
