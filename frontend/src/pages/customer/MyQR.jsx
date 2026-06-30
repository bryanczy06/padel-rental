import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CircleDot, Search } from 'lucide-react'
import QRCode from 'qrcode'

export default function MyQR() {
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
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 py-10" dir="rtl">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200">
            <CircleDot size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">הברקוד שלי</h1>
            <p className="text-sm text-gray-500 mt-1">הזן מספר טלפון לאיתור הברקוד</p>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">מספר טלפון</label>
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
                לא נמצא לקוח עם מספר זה
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : <><Search size={16} /> חפש</>}
            </button>
          </form>
        </div>

        {customer && qrUrl && (
          <div className="card flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">שלום, {customer.full_name}!</p>
              <p className="text-sm text-gray-500 mt-1">הברקוד שלך להשכרת מחבטים</p>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="bg-brand-50 rounded-xl px-4 py-3 text-center w-full">
              <p className="text-xs text-brand-700 font-medium">הצג ברקוד זה לעובד להשכרת מחבט</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
