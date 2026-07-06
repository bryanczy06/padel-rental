import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import QRCodeCard from '../../components/QRCodeCard'
import Spinner from '../../components/Spinner'
import { Plus, QrCode, Wrench, Check, CircleDot, Trash2, Archive, ArchiveRestore, ShieldCheck, Pencil, Download, Printer } from 'lucide-react'
import { exportRackets } from '../../lib/exportExcel'
import QRCode from 'qrcode'

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

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('he-IL')
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
  const [showArchive, setShowArchive] = useState(false)
  const [price, setPrice]       = useState(activeClub?.price_per_rental ?? '')
  const [editPrice, setEditPrice] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)

  async function load() {
    const { data } = await supabase.from('rackets').select('*')
      .eq('club_id', activeClub.id).order('created_at')
    setRackets(data || [])
    setLoading(false)
  }

  useEffect(() => { if (activeClub?.id) load() }, [activeClub?.id])

  const active   = rackets.filter(r => !r.archived_at)
  const archived = rackets.filter(r =>  r.archived_at)
  const displayed = showArchive ? archived : active

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
    if (!confirm(`למחוק לצמיתות את "${name}"? כל ההשכרות שלו יימחקו גם כן.`)) return
    await supabase.from('rentals').delete().eq('racket_id', id)
    const { error } = await supabase.from('rackets').delete().eq('id', id)
    if (error) { toast('שגיאה במחיקה: ' + error.message, 'error'); return }
    load()
  }

  async function archiveRacket(id, name) {
    if (!confirm(`להעביר את "${name}" לארכיון?`)) return
    const { error } = await supabase.from('rackets')
      .update({ archived_at: new Date().toISOString(), status: 'available' })
      .eq('id', id)
    if (error) { toast('שגיאה: ' + error.message, 'error'); return }
    toast('המחבט הועבר לארכיון')
    load()
  }

  async function printAllQR() {
    const activeRackets = rackets.filter(r => !r.archived_at)
    const labels = await Promise.all(activeRackets.map(async r => {
      const url = await QRCode.toDataURL(r.qr_code, { width: 120, margin: 1 })
      return { name: r.name, brand: r.brand || '', url }
    }))

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<title>ברקודים מחבטים</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .grid {
    display: grid;
    grid-template-columns: repeat(6, 27mm);
    gap: 2mm;
    padding: 5mm;
  }
  .label {
    width: 27mm; border: 1px dashed #bbb; border-radius: 2mm;
    padding: 1.5mm; display: flex; flex-direction: column;
    align-items: center; gap: 1mm; page-break-inside: avoid;
  }
  .label img { width: 23mm; height: 23mm; display: block; }
  .label .name { font-size: 9pt; font-weight: bold; text-align: center; line-height: 1.2; }
  .label .brand { font-size: 7.5pt; color: #666; text-align: center; }
  @media print {
    @page { margin: 4mm; size: A4 portrait; }
    body { -webkit-print-color-adjust: exact; }
  }
</style></head><body>
<div class="grid">
${labels.map(l => `
  <div class="label">
    <img src="${l.url}" />
    <div class="name">${l.name}</div>
    ${l.brand ? `<div class="brand">${l.brand}</div>` : ''}
  </div>`).join('')}
</div>
<script>window.onload = () => { window.print() }<\/script>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  async function savePrice() {
    const val = parseFloat(price)
    if (isNaN(val) || val < 0) return
    setSavingPrice(true)
    const { error } = await supabase.from('clubs').update({ price_per_rental: val }).eq('id', activeClub.id)
    setSavingPrice(false)
    if (error) { toast('שגיאה: ' + error.message, 'error'); return }
    activeClub.price_per_rental = val
    setEditPrice(false)
    toast('המחיר עודכן')
  }

  async function restoreRacket(id, name) {
    if (!confirm(`לשחזר את "${name}" מהארכיון?`)) return
    const { error } = await supabase.from('rackets')
      .update({ archived_at: null })
      .eq('id', id)
    if (error) { toast('שגיאה: ' + error.message, 'error'); return }
    toast('המחבט שוחזר')
    load()
  }

  if (loading) return <Layout><Spinner /></Layout>

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('rackets.title')}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowArchive(v => !v)}
              className={`btn-secondary text-sm ${showArchive ? 'bg-gray-100' : ''}`}
            >
              <Archive size={15} />
              {showArchive ? 'פעילים' : `ארכיון (${archived.length})`}
            </button>
            <button onClick={printAllQR} className="btn-secondary text-sm">
              <Printer size={15} /> הדפס ברקודים
            </button>
            <button onClick={() => exportRackets(rackets, activeClub?.price_per_rental, activeClub?.name)}
              className="btn-secondary text-sm">
              <Download size={15} /> אקסל
            </button>
            {!showArchive && (
              <button onClick={() => setAddOpen(true)} className="btn-primary">
                <Plus size={16} /> {t('rackets.add')}
              </button>
            )}
          </div>
        </div>

        {/* Price setting */}
        <div className="card flex items-center gap-3 py-3">
          <ShieldCheck size={18} className="text-brand-600 shrink-0" />
          <span className="text-sm font-medium text-gray-700">מחיר השכרה למחבט:</span>
          {editPrice ? (
            <div className="flex items-center gap-2 ms-auto">
              <input
                type="number" min="0" step="0.5" value={price}
                onChange={e => setPrice(e.target.value)}
                className="input w-24 py-1 text-sm"
                placeholder="₪"
                autoFocus
              />
              <button onClick={savePrice} disabled={savingPrice} className="btn-primary text-xs py-1.5 px-3">
                {savingPrice ? '...' : 'שמור'}
              </button>
              <button onClick={() => { setEditPrice(false); setPrice(activeClub?.price_per_rental ?? '') }}
                className="btn-secondary text-xs py-1.5 px-3">ביטול</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ms-auto">
              <span className="font-semibold text-gray-900">
                {activeClub?.price_per_rental != null ? `₪${activeClub.price_per_rental}` : 'לא הוגדר'}
              </span>
              <button onClick={() => setEditPrice(true)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map(r => (
            <div key={r.id} className={`card flex flex-col gap-3 ${r.archived_at ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  {r.brand && <p className="text-sm text-gray-500">{r.brand}</p>}
                </div>
                {!r.archived_at && <StatusBadge status={r.status} t={t} />}
                {r.archived_at && <span className="badge-red text-xs">ארכיון</span>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <CircleDot size={12} />
                  {t('rackets.usageCount')}: <span className="font-semibold text-gray-600">{r.usage_count}</span>
                </div>
                {activeClub?.price_per_rental != null && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    ₪{(r.usage_count * activeClub.price_per_rental).toLocaleString()} הכנסות
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-400 flex flex-col gap-0.5">
                <span>תאריך קליטה: <span className="text-gray-600">{fmt(r.created_at)}</span></span>
                {r.archived_at && (
                  <span>תאריך סיום: <span className="text-gray-600">{fmt(r.archived_at)}</span></span>
                )}
              </div>

              {r.notes && <p className="text-xs text-gray-400 italic">{r.notes}</p>}

              <div className="flex gap-2 flex-wrap mt-1">
                {!r.archived_at && (
                  <>
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
                    <button onClick={() => archiveRacket(r.id, r.name)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="העבר לארכיון">
                      <Archive size={15} />
                    </button>
                  </>
                )}
                {r.archived_at && (
                  <button onClick={() => restoreRacket(r.id, r.name)} className="btn-secondary text-xs py-1.5 px-3">
                    <ArchiveRestore size={13} /> שחזר
                  </button>
                )}
                <button onClick={() => deleteRacket(r.id, r.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ms-auto" title="מחק לצמיתות">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {displayed.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <CircleDot size={40} className="mx-auto mb-3 opacity-30" />
            <p>{showArchive ? 'אין מחבטים בארכיון' : t('common.noData')}</p>
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
