import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import QRCode from 'qrcode'
import { Search, Star } from 'lucide-react'

const STORAGE_KEY = 'padel_customer_id'

const T = {
  he: {
    tabQR:     'הברקוד שלי',
    tabJoin:   'הרשמה',
    qrTitle:   'הברקוד שלי',
    qrSub:     'הזן מספר טלפון לאיתור הברקוד',
    phoneLabel:'מספר טלפון',
    search:    'חפש',
    notFound:  'לא נמצא לקוח עם מספר זה',
    hello:     'שלום',
    qrCodeSub: 'הברקוד שלך להשכרת מחבטים',
    qrHint:    'הצג ברקוד זה לעובד להשכרת מחבט',
    joinTitle: 'הרשמה',
    joinSub:   'הירשם פעם אחת וקבל ברקוד קבוע',
    name:      'שם מלא *',
    namePh:    'ישראל ישראלי',
    phone:     'טלפון',
    email:     'מייל',
    submit:    'הירשם וקבל ברקוד',
    submitting:'רושם...',
    regError:  'שגיאה בהרשמה, נסה שוב',
    notMe:     'זה לא אני — הירשם מחדש',
  },
  en: {
    tabQR:     'My QR Code',
    tabJoin:   'Sign Up',
    qrTitle:   'My QR Code',
    qrSub:     'Enter your phone number to find your QR code',
    phoneLabel:'Phone number',
    search:    'Search',
    notFound:  'No customer found with this number',
    hello:     'Hello',
    qrCodeSub: 'Your racket rental QR code',
    qrHint:    'Show this code to the staff to rent a racket',
    joinTitle: 'Sign Up',
    joinSub:   'Register once and get your permanent QR code',
    name:      'Full Name *',
    namePh:    'John Smith',
    phone:     'Phone',
    email:     'Email',
    submit:    'Register & Get QR Code',
    submitting:'Registering...',
    regError:  'Registration error, please try again',
    notMe:     'Not me — register again',
  },
}

export default function CustomerPortal() {
  const [searchParams] = useSearchParams()
  const initTab = searchParams.get('tab') === 'join' ? 'join' : 'qr'

  const [lang, setLang]   = useState('he')
  const [tab, setTab]     = useState(initTab)
  const t = T[lang]
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  // ── QR tab state ──
  const [phone, setPhone]       = useState('')
  const [qrResult, setQrResult] = useState(null) // { customer, url }
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound]   = useState(false)

  // ── Join tab state ──
  const [step, setStep]         = useState('loading') // loading | register | qr
  const [form, setForm]         = useState({ full_name: '', phone: '', email: '' })
  const [joinCustomer, setJoinCustomer] = useState(null)
  const [joinQrUrl, setJoinQrUrl]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    async function init() {
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const { data } = await supabase.from('customers').select('*').eq('id', savedId).single()
        if (data) {
          setJoinCustomer(data)
          const url = await QRCode.toDataURL(data.qr_code, { width: 280, margin: 2 })
          setJoinQrUrl(url)
          setStep('qr')
          return
        }
      }
      setStep('register')
    }
    init()
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setSearching(true)
    setNotFound(false)
    setQrResult(null)
    const { data } = await supabase.from('customers').select('*')
      .eq('phone', phone.trim()).maybeSingle()
    setSearching(false)
    if (!data) { setNotFound(true); return }
    const url = await QRCode.toDataURL(data.qr_code, { width: 280, margin: 2 })
    setQrResult({ customer: data, url })
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    setJoinError('')
    const { data, error: err } = await supabase.from('customers')
      .insert({ full_name: form.full_name, phone: form.phone, email: form.email })
      .select().single()
    setSaving(false)
    if (err) { setJoinError(t.regError); return }
    localStorage.setItem(STORAGE_KEY, data.id)
    setJoinCustomer(data)
    const url = await QRCode.toDataURL(data.qr_code, { width: 280, margin: 2 })
    setJoinQrUrl(url)
    setStep('qr')
  }

  function QRDisplay({ customer, url, hint, onReset }) {
    return (
      <div className="card flex flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{t.hello}, {customer.full_name}!</p>
          <p className="text-sm text-gray-500 mt-1">{t.qrCodeSub}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <img src={url} alt="QR Code" className="w-64 h-64" />
        </div>
        <div className="flex items-center justify-center gap-2 bg-amber-50 rounded-xl px-4 py-2.5">
          <Star size={15} className="text-amber-500 fill-amber-400" />
          <span className="text-sm font-semibold text-amber-700">{customer.points ?? 0} נקודות</span>
        </div>
        <div className="bg-brand-50 rounded-xl px-4 py-3 text-center w-full">
          <p className="text-xs text-brand-700 font-medium">{hint}</p>
        </div>
        {onReset && (
          <button onClick={onReset} className="text-xs text-gray-400 underline">
            {t.notMe}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 py-10" dir={dir}>
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Language toggle */}
        <div className="flex justify-end">
          <button onClick={() => setLang(l => l === 'he' ? 'en' : 'he')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <img src="/racktive-icon.svg" alt="Racktive" className="h-16 w-auto" />
          <p className="text-sm text-gray-500">Racktive</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
          {['qr', 'join'].map(v => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === v
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {v === 'qr' ? t.tabQR : t.tabJoin}
            </button>
          ))}
        </div>

        {/* QR Tab */}
        {tab === 'qr' && (
          <>
            <div className="card">
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.phoneLabel}</label>
                  <input type="tel" required value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input" placeholder="050-0000000" />
                </div>
                {notFound && (
                  <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">{t.notFound}</p>
                )}
                <button type="submit" disabled={searching} className="btn-primary w-full">
                  {searching ? '...' : <><Search size={16} /> {t.search}</>}
                </button>
              </form>
            </div>
            {qrResult && (
              <QRDisplay customer={qrResult.customer} url={qrResult.url} hint={t.qrHint} />
            )}
          </>
        )}

        {/* Join Tab */}
        {tab === 'join' && (
          <>
            {step === 'loading' && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              </div>
            )}
            {step === 'register' && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">{t.joinTitle}</h2>
                <p className="text-sm text-gray-500 text-center mb-5">{t.joinSub}</p>
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.name}</label>
                    <input required value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      className="input" placeholder={t.namePh} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.phone}</label>
                    <input type="tel" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="input" placeholder="050-0000000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.email}</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="input" placeholder="you@example.com" />
                  </div>
                  {joinError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{joinError}</p>}
                  <button type="submit" disabled={saving} className="btn-primary w-full mt-1">
                    {saving ? t.submitting : t.submit}
                  </button>
                </form>
              </div>
            )}
            {step === 'qr' && joinCustomer && (
              <QRDisplay
                customer={joinCustomer}
                url={joinQrUrl}
                hint={t.qrHint}
                onReset={() => {
                  localStorage.removeItem(STORAGE_KEY)
                  setStep('register')
                  setJoinCustomer(null)
                  setJoinQrUrl('')
                }}
              />
            )}
          </>
        )}

      </div>
    </div>
  )
}
