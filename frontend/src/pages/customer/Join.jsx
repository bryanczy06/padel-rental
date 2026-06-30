import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CircleDot } from 'lucide-react'
import QRCode from 'qrcode'

const STORAGE_KEY = 'padel_customer_id'

export default function Join() {
  const [searchParams] = useSearchParams()
  const clubSlug = searchParams.get('club') || 'default'

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

    // Get club_id
    const { data: clubData } = await supabase
      .from('clubs').select('id').eq('slug', clubSlug).single()

    if (!clubData) {
      setError('מועדון לא נמצא')
      setSaving(false)
      return
    }

    const { data, error: err } = await supabase
      .from('customers')
      .insert({ club_id: clubData.id, full_name: form.full_name, phone: form.phone, email: form.email })
      .select().single()

    setSaving(false)
    if (err) { setError('שגיאה בהרשמה, נסה שוב'); return }

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
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200 mb-3">
            <CircleDot size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{club?.name || 'PadelRent'}</h1>
        </div>

        {step === 'register' && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">הרשמה</h2>
            <p className="text-sm text-gray-500 text-center mb-5">הירשם פעם אחת וקבל ברקוד קבוע</p>
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">שם מלא *</label>
                <input required value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="input" placeholder="ישראל ישראלי" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">טלפון</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input" placeholder="050-0000000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">מייל</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input" placeholder="you@example.com" />
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={saving} className="btn-primary w-full mt-1">
                {saving ? 'רושם...' : 'הירשם וקבל ברקוד'}
              </button>
            </form>
          </div>
        )}

        {step === 'qr' && customer && (
          <div className="card flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">שלום, {customer.full_name}!</p>
              <p className="text-sm text-gray-500 mt-1">הברקוד שלך להשכרת מחבטים</p>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="bg-brand-50 rounded-xl px-4 py-3 text-center w-full">
              <p className="text-xs text-brand-700 font-medium">הצג ברקוד זה בכניסה להשכרת מחבט</p>
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
              זה לא אני — הירשם מחדש
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
