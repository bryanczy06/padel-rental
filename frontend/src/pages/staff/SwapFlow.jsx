import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import QRScanner from '../../components/QRScanner'
import Spinner from '../../components/Spinner'
import { ArrowLeftRight, CircleDot, User, ChevronRight, CheckCircle2 } from 'lucide-react'

const STEP = { SCAN_OLD: 1, SCAN_NEW: 2, CONFIRM: 3, DONE: 4 }

export default function SwapFlow() {
  const { profile, activeClub } = useAuth()
  const navigate  = useNavigate()
  const toast     = useToast()

  const [step, setStep]       = useState(STEP.SCAN_OLD)
  const [oldRacket, setOldRacket] = useState(null)
  const [oldRental, setOldRental] = useState(null)
  const [newRacket, setNewRacket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleOldRacketQR(code) {
    setLoading(true)
    setError('')
    const { data: r } = await supabase.from('rackets').select('*').eq('qr_code', code).single()
    if (!r) { setError('מחבט לא נמצא'); setLoading(false); return }

    const { data: rental } = await supabase
      .from('rentals')
      .select('*, customers(id, full_name, phone)')
      .eq('racket_id', r.id)
      .is('returned_at', null)
      .single()

    setLoading(false)
    if (!rental) { setError('מחבט זה אינו מושכר כרגע'); return }
    setOldRacket(r)
    setOldRental(rental)
    setStep(STEP.SCAN_NEW)
  }

  async function handleNewRacketQR(code) {
    setLoading(true)
    setError('')
    if (code === oldRacket.qr_code) { setError('סרקת את אותו מחבט'); setLoading(false); return }

    const { data: r } = await supabase.from('rackets').select('*').eq('qr_code', code).single()
    if (!r) { setError('מחבט לא נמצא'); setLoading(false); return }
    if (r.status !== 'available') { setError('המחבט החדש אינו פנוי'); setLoading(false); return }

    setLoading(false)
    setNewRacket(r)
    setStep(STEP.CONFIRM)
  }

  async function confirmSwap() {
    setLoading(true)
    const now = new Date().toISOString()

    const { error: e1 } = await supabase.from('rentals')
      .update({ returned_at: now, returned_by: profile.id, condition: 'good' })
      .eq('id', oldRental.id)
    if (e1) { setError('שגיאה בסגירת ההשכרה הישנה'); setLoading(false); return }

    await supabase.from('rackets').update({ status: 'available' }).eq('id', oldRacket.id)

    const { error: e2 } = await supabase.from('rentals').insert({
      racket_id:  newRacket.id,
      customer_id: oldRental.customers.id,
      club_id:    activeClub.id,
      rented_by:  profile.id,
      started_at: now,
    })
    if (e2) { setError('שגיאה ביצירת ההשכרה החדשה'); setLoading(false); return }

    await supabase.from('rackets').update({ status: 'rented', usage_count: (newRacket.usage_count || 0) + 1 }).eq('id', newRacket.id)

    setLoading(false)
    toast('המחבט הוחלף בהצלחה')
    setStep(STEP.DONE)
  }

  function reset() {
    setStep(STEP.SCAN_OLD)
    setOldRacket(null)
    setOldRental(null)
    setNewRacket(null)
    setError('')
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/staff')} className="btn-secondary p-2">
            <ChevronRight size={18} className="rtl-flip" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-brand-600" /> החלף מחבט
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(n => (
            <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${step > n ? 'bg-brand-600' : step === n ? 'bg-brand-400' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        {/* Step 1: scan old racket */}
        {step === STEP.SCAN_OLD && (
          <div className="card flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CircleDot size={18} className="text-brand-600" /> שלב 1: סרוק את המחבט הישן
            </h2>
            <p className="text-sm text-gray-500">סרוק את המחבט שמושכר כרגע ללקוח</p>
            {loading ? <Spinner /> : <QRScanner onResult={handleOldRacketQR} large />}
          </div>
        )}

        {/* Step 2: scan new racket */}
        {step === STEP.SCAN_NEW && (
          <div className="flex flex-col gap-4">
            <div className="card border border-brand-100">
              <p className="text-xs text-gray-500 mb-1">מחבט ישן</p>
              <p className="font-semibold text-gray-900">{oldRacket?.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <User size={14} className="text-gray-400" />
                <p className="text-sm text-gray-700">{oldRental?.customers?.full_name}</p>
              </div>
            </div>
            <div className="card flex flex-col gap-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CircleDot size={18} className="text-brand-600" /> שלב 2: סרוק את המחבט החדש
              </h2>
              <p className="text-sm text-gray-500">סרוק מחבט פנוי שיקבל את הלקוח</p>
              {loading ? <Spinner /> : <QRScanner key="new" onResult={handleNewRacketQR} large />}
            </div>
          </div>
        )}

        {/* Step 3: confirm */}
        {step === STEP.CONFIRM && (
          <div className="flex flex-col gap-4">
            <div className="card border border-amber-100 bg-amber-50">
              <p className="font-semibold text-amber-800 mb-3">אישור החלפה</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-500">מחבט ישן</p>
                  <p className="font-medium text-gray-900">{oldRacket?.name}</p>
                </div>
                <ArrowLeftRight size={18} className="text-amber-500 shrink-0" />
                <div className="flex-1 bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-500">מחבט חדש</p>
                  <p className="font-medium text-gray-900">{newRacket?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <User size={14} className="text-amber-600" />
                <p className="text-sm text-amber-800 font-medium">{oldRental?.customers?.full_name}</p>
              </div>
            </div>
            <button onClick={confirmSwap} disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'מבצע החלפה...' : 'אשר החלפה'}
            </button>
            <button onClick={() => setStep(STEP.SCAN_NEW)} className="btn-secondary w-full">חזור</button>
          </div>
        )}

        {/* Done */}
        {step === STEP.DONE && (
          <div className="card flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">המחבט הוחלף בהצלחה!</p>
              <p className="text-sm text-gray-500 mt-1">
                {oldRacket?.name} ← {newRacket?.name} · {oldRental?.customers?.full_name}
              </p>
            </div>
            <button onClick={reset} className="btn-primary w-full">החלפה נוספת</button>
            <button onClick={() => navigate('/staff')} className="btn-secondary w-full">חזור לדשבורד</button>
          </div>
        )}
      </div>
    </Layout>
  )
}
