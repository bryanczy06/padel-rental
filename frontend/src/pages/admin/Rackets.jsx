import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import QRCodeCard from '../../components/QRCodeCard'
import Spinner from '../../components/Spinner'
import { Plus, QrCode, Wrench, Check, CircleDot, Trash2 } from 'lucide-react'

function StatusBadge({ status, t }) {
  const map = {
    available: 'badge-green',
    rented:    'badge-amber',
    repair:    'badge-red',
  }
  const labels = {
    available: t('rackets.available'),
    rented:    t('rackets.rented'),
    repair:    t('rackets.repair'),
  }
  return <span className={map[status]}>{labels[status]}</span>
}

export default function Rackets() {
  const { t }                   = useTranslation()
  const { profile, activeClub } = useAuth()
  const toast       = useToast()
  const [rackets, setRackets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [addOpen, setAddOpen]   = useState(false)
  const [qrTarget, setQRTarget] = useState(null)
  const [form, setForm]         = useState({ name: '', brand: '', notes: '' })
  const [saving, setSaving]     = useState(false)

  async function load() {
    const { data } = await supabase.from('rackets').select('*')
      .eq('club_id', activeClub.id).order('created_at')
    setRackets(data || [])
    setLoading(false)
  }

  useEffect(() => { if (activeClub?.id) load() }, [activeClub?.id])

  async function addRacket(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('rackets').insert({
      ...form, club_id: activeClub.id
    })
    setSaving(false)
    if (error) { toast(t('common.error'), 'error'); return }
    toast(t('rackets.addSuccess'))
    setForm({ name: '', brand: '', notes: '' })
    setAddOpen(false)
    load()
  }

  async function setStatus(id, status) {
    await supabase.from('rackets').update({ status }).eq('id', id)
    load()
  }

  async function deleteRacket(id, name) {
    if (!confirm(`למחוק את "${name}"?`)) return
    await supabase.from('rackets').delete().eq('id', id)
    load()
  }

  if (loading) return <Layout><Spinner /></Layout>

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('rackets.title')}</h1>
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <Plus size={16} /> {t('rackets.add')}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rackets.map(r => (
            <div key={r.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  {r.brand && <p className="text-sm text-gray-500">{r.brand}</p>}
                </div>
                <StatusBadge status={r.status} t={t} />
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CircleDot size={12} />
                {t('rackets.usageCount')}: <span className="font-semibold text-gray-600">{r.usage_count}</span>
              </div>

              {r.notes && <p className="text-xs text-gray-400 italic">{r.notes}</p>}

              <div className="flex gap-2 flex-wrap mt-1">
                <button onClick={() => setQRTarget(r)} className="btn-secondary text-xs py-1.5 px-3">
                  <QrCode size={13} /> QR
                </button>
                {r.status === 'available' || r.status === 'rented' ? (
                  <button onClick={() => setStatus(r.id, 'repair')} className="btn-danger text-xs py-1.5 px-3">
                    <Wrench size={13} /> {t('rackets.sendToRepair')}
                  </button>
                ) : (
                  <button onClick={() => setStatus(r.id, 'available')} className="btn-secondary text-xs py-1.5 px-3">
                    <Check size={13} /> {t('rackets.markAvailable')}
                  </button>
                )}
                <button onClick={() => deleteRacket(r.id, r.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ms-auto">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {rackets.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CircleDot size={40} className="mx-auto mb-3 opacity-30" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('rackets.add')}>
        <form onSubmit={addRacket} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('rackets.name')} *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="מחבט #1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('rackets.brand')}</label>
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
              className="input" placeholder="Babolat, Head..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('rackets.notes')}</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input resize-none" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? t('common.loading') : t('rackets.saveBtn')}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR modal */}
      <Modal open={!!qrTarget} onClose={() => setQRTarget(null)} title={t('rackets.qrCode')}>
        {qrTarget && (
          <QRCodeCard value={qrTarget.qr_code} label={qrTarget.name} sublabel={qrTarget.brand} />
        )}
      </Modal>
    </Layout>
  )
}
