import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import { Plus, Trash2, UserCog, Phone, Mail, Shield } from 'lucide-react'

export default function Staff() {
  const { t }       = useTranslation()
  const { profile } = useAuth()
  const toast       = useToast()
  const [staff, setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm]     = useState({ full_name: '', email: '', phone: '', password: '', role: 'staff' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles').select('*')
      .eq('club_id', profile.club_id).order('created_at')
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => { if (profile?.club_id) load() }, [profile])

  async function addStaff(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
        }),
      }
    )
    const json = await res.json()
    setSaving(false)
    if (!res.ok || json.error) {
      toast(json.error || t('common.error'), 'error')
      return
    }
    toast(t('staff.addSuccess'))
    setAddOpen(false)
    setForm({ full_name: '', email: '', phone: '', password: '', role: 'staff' })
    load()
  }

  async function removeStaff(id) {
    if (!confirm(t('staff.removeConfirm'))) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  if (loading) return <Layout><Spinner /></Layout>

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('staff.title')}</h1>
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <Plus size={16} /> {t('staff.add')}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map(s => (
            <div key={s.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                    ${s.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.full_name}</p>
                    <div className="flex items-center gap-1">
                      {s.role === 'admin' && <Shield size={11} className="text-brand-600" />}
                      <p className="text-xs text-gray-500">
                        {s.role === 'admin' ? t('staff.admin') : t('staff.staffRole')}
                      </p>
                    </div>
                  </div>
                </div>
                {s.id !== profile.id && (
                  <button onClick={() => removeStaff(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {s.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} /> {s.phone}</p>}
            </div>
          ))}
        </div>

        {staff.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <UserCog size={40} className="mx-auto mb-3 opacity-30" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('staff.add')}>
        <form onSubmit={addStaff} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.fullName')} *</label>
            <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.email')} *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.phone')}</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.password')} *</label>
            <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input" minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.role')}</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input">
              <option value="staff">{t('staff.staffRole')}</option>
              <option value="admin">{t('staff.admin')}</option>
            </select>
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? t('common.loading') : t('staff.saveBtn')}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
