import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search } from 'lucide-react'
import RacktiveLogo from '../../components/RacktiveLogo'
import QRCode from 'qrcode'

const T = {
  he: {
    title: 'הברקוד שלי',
    subtitle: 'הזן מספר טלפון לאיתור הברקוד',
    phoneLabel: 'מספר טלפון',
    search: 'חפש',
    notFound: 'לא נמצא לקוח עם מספר זה',
    hello: 'שלום',
    qrSub: 'הברקוד שלך להשכרת מחבטים',
    qrHint: 'הצג ברקוד זה לעובד להשכרת מחבט',
  },
  en: {
    title: 'My QR Code',
    subtitle: 'Enter your phone number to find your QR code',
    phoneLabel: 'Phone number',
    search: 'Search',
    notFound: 'No customer found with this number',
    hello: 'Hello',
    qrSub: 'Your racket rental QR code',
    qrHint: 'Show this code to the staff to rent a racket',
  },
}

export default function MyQR() {
  const [lang, setLang]       = useState('he')
  const t = T[lang]
  const [phone, setPhone]     = useState('')
  const [qrUrl, setQrUrl]     = useState('')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setNotFound(false)
    setCustomer(null)
    setQrUrl('')

    const { data } = await supabase
      .from('customers').select('*')
      .eq('phone', phone.trim()).maybeSingle()

    setLoading(false)
    if (!data) { setNotFound(true); return }

    const url = await QRCode.toDataURL(data.qr_code, { width: 280, margin: 2 })
    setCustomer(data)
    setQrUrl(url)
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 py-10" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="flex justify-end">
          <button onClick={() => setLang(l => l === 'he' ? 'en' : 'he')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200">
            <RacktiveLogo size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.phoneLabel}</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input"
                placeholder="050-0000000"
                required
              />
            </div>
            {notFound && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg text-center">
                {t.notFound}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : <><Search size={16} /> {t.search}</>}
            </button>
          </form>
        </div>

        {customer && qrUrl && (
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
          </div>
        )}

      </div>
    </div>
  )
}
