import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CircleDot } from 'lucide-react'
import QRCode from 'qrcode'

const T = {
  he: {
    title: 'הרשמה',
    subtitle: 'הירשם פעם אחת וקבל ברקוד קבוע',
    name: 'שם מלא *',
    namePh: 'ישראל ישראלי',
    phone: 'טלפון',
    email: 'מייל',
    submit: 'הירשם וקבל ברקוד',
    submitting: 'רושם...',
    notFound: 'מועדון לא נמצא',
    regError: 'שגיאה בהרשמה, נסה שוב',
    hello: 'שלום',
    qrSub: 'הברקוד שלך להשכרת מחבטים',
    qrHint: 'הצג ברקוד זה בכניסה להשכרת מחבט',
    notMe: 'זה לא אני — הירשם מחדש',
  },
  en: {
    title: 'Sign Up',
    subtitle: 'Register once and get your permanent QR code',
    name: 'Full Name *',
    namePh: 'John Smith',
    phone: 'Phone',
    email: 'Email',
    submit: 'Register & Get QR Code',
    submitting: 'Registering...',
    notFound: 'Club not found',
    regError: 'Registration error, please try again',
    hello: 'Hello',
    qrSub: 'Your racket rental QR code',
    qrHint: 'Show this code at the counter to rent a racket',
    notMe: "Not me — register again",
  },
}

const STORAGE_KEY = 'padel_customer_id'

export default function Join() {
  const [searchParams] = useSearchParams()
  const clubSlug = searchParams.get('club') || 'default'

  const [lang, setLang]       = useState('he')
  const t = T[lang]
  const [step, setStep]       = useState('loading') // loading | register | qr
  const [form, setForm]       = useState({ full_name: '', phone: '', email: '' })
  const [customer, setCustomer] = useState(null)
  const [qrUrl, setQrUrl]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [club, setClub]       = useState(null)

  useEffect(() => {
    async function init() {
      // Load club info
      const { data: clubData } = await supabase
        .from('clubs').select('*').eq('slug', clubSlug).single()
      setClub(clubData)

      // Check if already registered
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const { data } = await supabase
          .from('customers').select('*').eq('id', savedId).single()
        if (data) {
          setCustomer(data)
          const url = await QRCode.toDataURL(data.qr_code, { width: 280, margin: 2 })
          setQrUrl(url)
          setStep('qr')
          return
        }
      }
      setStep('register')
    }
    init()
  }, [clubSlug])

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    setError('')

    const { data, error: err } = await supabase
      .from('customers')
      .insert({ full_name: form.full_name, phone: form.phone, email: form.email })
      .select().single()

    setSaving(false)
    if (err) { setError(t.regError); return }

    localStorage.setItem(STORAGE_KEY, data.id)
    setCustomer(data)
    const url = await QRCode.toDataURL(data.qr_code, { width: 280, margin: 2 })
    setQrUrl(url)
    setStep('qr')
  }

  if (step === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 py-10" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button onClick={() => setLang(l => l === 'he' ? 'en' : 'he')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200 mb-3">
            <CircleDot size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{club?.name || 'PadelRent'}</h1>
        </div>

        {step === 'register' && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">{t.title}</h2>
            <p className="text-sm text-gray-500 text-center mb-5">{t.subtitle}</p>
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
              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={saving} className="btn-primary w-full mt-1">
                {saving ? t.submitting : t.submit}
              </button>
            </form>
          </div>
        )}

        {step === 'qr' && customer && (
          <div className="card flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{t.hello}, {customer.full_name}!</p>
              <p className="text-sm text-gray-500 mt-1">{t.qrSub}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="bg-brand-50 rounded-xl px-4 py-3 text-center w-full">
              <p className="text-xs text-brand-700 font-medium">{t.qrHint}</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY)
                setStep('register')
                setCustomer(null)
                setQrUrl('')
              }}
              className="text-xs text-gray-400 underline"
            >
              {t.notMe}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
