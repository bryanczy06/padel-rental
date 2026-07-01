import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import QRCodeCard from '../../components/QRCodeCard'
import Spinner from '../../components/Spinner'
import { Plus, QrCode, Search, Users, Phone, Mail, ClipboardList, Trash2, AlertTriangle } from 'lucide-react'

export default function Customers() {
  const { t }                    = useTranslation()
  const { profile, activeClub }  = useAuth()
  const toast       = useToast()
  const [customers, setCustomers] = useState([])
  const [damagedIds, setDamagedIds] = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [addOpen, setAddOpen]     = useState(false)
  const [qrTarget, setQRTarget]   = useState(null)
  const [histTarget, setHistTarget] = useState(null)
  const [history, setHistory]     = useState([])
  const [form, setForm]           = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving]       = useState(false)

  async function load() {
    const clubId = activeClub?.id || profile?.club_id
    const [{ data: custs }, { data: dmg }] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      clubId
        ? supabase.from('rentals').select('customer_id').eq('condition', 'damaged').eq('club_id', clubId)
        : supabase.from('rentals').select('customer_id').eq('condition', 'damaged'),
    ])
    setCustomers(custs || [])
    setDamagedIds(new Set((dmg || []).map(r => r.customer_id)))
    setLoading(false)
  }

  useEffect(() => { load() }, [activeClub?.id])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.full_name?.toLowerCase().includes(q)
      || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
  })

  async function addCustomer(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('customers').insert({ ...form })
    setSaving(false)
    if (error) { toast(t('common.error'), 'error'); return }
    toast(t('customers.addSuccess'))
    setForm({ full_name: '', email: '', phone: '' })
    setAddOpen(false)
    load()
  }

  async function deleteCustomer(id, name) {
    if (!confirm(`למחוק את "${name}"?`)) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) { alert('שגיאה במחיקה: ' + error.message); return }
    load()
  }

  async function openHistory(c) {
    setHistTarget(c)
    const { data } = await supabase.from('rentals')
      .select('*, rackets(name, brand)')
      .eq('customer_id', c.id)
      .order('started_at', { ascending: false })
      .limit(30)
    setHistory(data || [])
  }

  if (loading) return <Layout><Spinner /></Layout>

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('customers.title')}</h1>
          <button onClick={() => setAddOpen(true)} className="btn-primary shrink-0">
            <Plus size={16} /> {t('customers.add')}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute top-3 start-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input ps-9" placeholder={t('customers.search')} />
        </div>

        {/* List */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => {
            const isDamaged = damagedIds.has(c.id)
            return (
            <div key={c.id} className={`card flex flex-col gap-3 ${isDamaged ? 'border-red-200 bg-red-50/40' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isDamaged ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
                    {c.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{c.full_name}</p>
                      {isDamaged && (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                          <AlertTriangle size={11} /> שבר מחבט
                        </span>
                      )}
                    </div>
                    {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} /> {c.phone}</p>}
                    {c.email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={11} /> {c.email}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setQRTarget(c)} className="btn-secondary text-xs py-1.5 px-3">
                  <QrCode size={13} /> QR
                </button>
                <button onClick={() => openHistory(c)} className="btn-secondary text-xs py-1.5 px-3">
                  <ClipboardList size={13} /> {t('customers.viewHistory')}
                </button>
                <button onClick={() => deleteCustomer(c.id, c.full_name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ms-auto">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )})}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('customers.add')}>
        <form onSubmit={addCustomer} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('customers.fullName')} *</label>
            <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="input" placeholder="ישראל ישראלי" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('customers.phone')}</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="input" placeholder="050-0000000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('customers.email')}</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input" placeholder="israel@example.com" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? t('common.loading') : t('customers.saveBtn')}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR modal */}
      <Modal open={!!qrTarget} onClose={() => setQRTarget(null)} title={t('customers.qrCode')}>
        {qrTarget && (
          <QRCodeCard value={qrTarget.qr_code} label={qrTarget.full_name} sublabel={qrTarget.phone} />
        )}
      </Modal>

      {/* History modal */}
      <Modal open={!!histTarget} onClose={() => { setHistTarget(null); setHistory([]) }}
        title={histTarget?.full_name} maxW="max-w-lg">
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {history.length === 0
            ? <p className="text-center text-gray-400 py-8">{t('common.noData')}</p>
            : history.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.rackets?.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.started_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {r.returned_at
                  ? <span className={`badge ${r.condition === 'damaged' ? 'badge-amber' : 'badge-green'}`}>
                      {r.condition === 'damaged' ? t('return.damaged') : t('return.good')}
                    </span>
                  : <span className="badge badge-amber">{t('history.open')}</span>}
              </div>
            ))
          }
        </div>
      </Modal>
    </Layout>
  )
}
