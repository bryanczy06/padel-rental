import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import QRScanner from '../../components/QRScanner'
import Spinner from '../../components/Spinner'
import { CheckCircle2, CircleDot, User, ChevronRight, AlertTriangle } from 'lucide-react'

const STEP = { SCAN: 1, CONDITION: 2, DONE: 3 }

export default function ReturnFlow() {
  const { t }       = useTranslation()
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const toast       = useToast()

  const [step, setStep]         = useState(STEP.SCAN)
  const [rental, setRental]     = useState(null)
  const [racket, setRacket]     = useState(null)
  const [condition, setCondition] = useState('good')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleRacketQR(code) {
    setLoading(true)
    setError('')
    const { data: r } = await supabase.from('rackets').select('*').eq('qr_code', code).single()
    if (!r) { setError('לא נמצא מחבט / Racket not found'); setLoading(false); return }

    const { data: openRental } = await supabase
      .from('rentals')
      .select('*, customers(full_name, phone)')
      .eq('racket_id', r.id)
      .is('returned_at', null)
      .single()

    setLoading(false)
    if (!openRental) { setError(t('return.noOpenRental')); return }
    setRacket(r)
    setRental(openRental)
    setStep(STEP.CONDITION)
  }

  async function confirmReturn() {
    setLoading(true)
    const now = new Date().toISOString()
    const { error: err } = await supabase.from('rentals').update({
      returned_at:  now,
      returned_by:  profile.id,
      condition,
      notes: notes || null,
    }).eq('id', rental.id)

    if (!err) {
      await supabase.from('rackets')
        .update({ status: condition === 'damaged' ? 'repair' : 'available' })
        .eq('id', racket.id)
    }
    setLoading(false)
    if (err) { setError(t('common.error')); return }
    toast(t('return.success'))
    setStep(STEP.DONE)
  }

  function duration() {
    if (!rental) return ''
    const mins = Math.round((Date.now() - new Date(rental.started_at)) / 60000)
    if (mins < 60) return `${mins} ${t('history.minutes')}`
    return `${Math.floor(mins / 60)}${t('history.hours')} ${mins % 60}${t('history.minutes')}`
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/staff')} className="btn-secondary p-2">
            <ChevronRight size={18} className="rtl-flip" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('return.title')}</h1>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        {step === STEP.SCAN && (
          <div className="card flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CircleDot size={18} className="text-brand-600" /> {t('return.scanRacket')}
            </h2>
            {loading ? <Spinner /> : <QRScanner onResult={handleRacketQR} />}
          </div>
        )}

        {step === STEP.CONDITION && (
          <div className="flex flex-col gap-4">
            {/* Rental info */}
            <div className="card border border-brand-100">
              <div className="flex items-center gap-3 mb-3">
                <CircleDot size={18} className="text-brand-600" />
                <div>
                  <p className="text-xs text-gray-500">{t('history.racket')}</p>
                  <p className="font-semibold">{racket.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{t('history.customer')}</p>
                  <p className="font-medium">{rental.customers?.full_name}</p>
                </div>
                <span className="ms-auto text-xs text-gray-400">{duration()}</span>
              </div>
            </div>

            {/* Condition */}
            <div className="card flex flex-col gap-3">
              <p className="font-semibold text-gray-900">{t('return.condition')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCondition('good')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-sm font-medium
                    ${condition === 'good' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <CheckCircle2 size={24} className={condition === 'good' ? 'text-brand-600' : 'text-gray-400'} />
                  {t('return.good')}
                </button>
                <button
                  onClick={() => setCondition('damaged')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-sm font-medium
                    ${condition === 'damaged' ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <AlertTriangle size={24} className={condition === 'damaged' ? 'text-red-500' : 'text-gray-400'} />
                  {t('return.damaged')}
                </button>
              </div>

              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder={t('return.notes')}
                className="input resize-none"
              />

              <button onClick={confirmReturn} disabled={loading} className="btn-primary w-full py-3">
                {loading ? t('common.loading') : t('return.confirm')}
              </button>
            </div>
          </div>
        )}

        {step === STEP.DONE && (
          <div className="card flex flex-col items-center gap-4 py-10 text-center">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center
              ${condition === 'good' ? 'bg-brand-50' : 'bg-amber-50'}`}>
              {condition === 'good'
                ? <CheckCircle2 size={36} className="text-brand-600" />
                : <AlertTriangle size={36} className="text-amber-500" />}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-xl">{t('return.success')}</p>
              <p className="text-sm text-gray-500 mt-1">
                {racket.name} · {rental.customers?.full_name}
              </p>
              {condition === 'damaged' && (
                <p className="text-sm text-amber-600 mt-1 font-medium">→ נשלח לתיקון / Sent to repair</p>
              )}
            </div>
            <button onClick={() => { setStep(STEP.SCAN); setRental(null); setRacket(null); setNotes(''); setCondition('good') }}
              className="btn-primary w-full">
              {t('return.title')}
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
