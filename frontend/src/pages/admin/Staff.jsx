import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import { Plus, Trash2, UserCog, Phone, Shield, Crown, Pencil } from 'lucide-react'

function roleBadge(role) {
  if (role === 'owner')      return { label: 'בעלים',  icon: Crown,  color: 'bg-amber-100 text-amber-700',  iconColor: 'text-amber-500' }
  if (role === 'admin')      return { label: 'מנהל',   icon: Shield, color: 'bg-brand-100 text-brand-700',  iconColor: 'text-brand-600' }
  if (role === 'super_admin') return { label: 'סופר אדמין', icon: Shield, color: 'bg-purple-100 text-purple-700', iconColor: 'text-purple-600' }
  return                            { label: 'עובד',   icon: null,   color: 'bg-gray-100 text-gray-600',    iconColor: '' }
}

export default function Staff() {
  const { t }                            = useTranslation()
  const { profile, activeClub, availableClubs } = useAuth()
  const toast                            = useToast()
  const isSuperAdmin = profile?.role === 'super_admin'
  const isOwner      = profile?.role === 'owner'
  const canManageClubs = isSuperAdmin || isOwner

  const [staff, setStaff]       = useState([])
  const [allClubs, setAllClubs] = useState([])
  const [loading, setLoading]   = useState(true)
  const [addOpen, setAddOpen]   = useState(false)
  const [addTab, setAddTab]     = useState('new') // 'new' | 'existing'
  const [assignEmail, setAssignEmail] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]         = useState({ full_name: '', email: '', phone: '', password: '', role: 'staff' })
  const [editForm, setEditForm] = useState({ role: 'staff', club_id: '' })
  const [saving, setSaving]     = useState(false)

  async function load() {
    if (!activeClub?.id) return
    const [{ data: staffData }, { data: clubData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('club_id', activeClub.id).order('created_at'),
      supabase.from('clubs').select('owner_id, profiles!clubs_owner_id_fkey(*)').eq('id', activeClub.id).single(),
    ])
    const list = (staffData || []).filter(s => s.role !== 'super_admin')
    const owner = clubData?.profiles
    if (owner && owner.role !== 'super_admin' && !list.find(s => s.id === owner.id)) {
      list.unshift(owner)
    }
    setStaff(list)
    setLoading(false)
  }

  useEffect(() => {
    if (activeClub?.id) load()
  }, [activeClub?.id])

  useEffect(() => {
    // load clubs for the club-transfer dropdown
    if (canManageClubs) {
      if (availableClubs.length) { setAllClubs(availableClubs); return }
      supabase.from('clubs').select('id, name').order('name').then(({ data }) => setAllClubs(data || []))
    }
  }, [availableClubs])

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
          club_id: activeClub.id,
        }),
      }
    )
    const json = await res.json()
    setSaving(false)
    if (!res.ok || json.error) { toast(json.error || t('common.error'), 'error'); return }
    toast(t('staff.addSuccess'))
    setAddOpen(false)
    setForm({ full_name: '', email: '', phone: '', password: '', role: 'staff' })
    load()
  }

  async function assignExisting(e) {
    e.preventDefault()
    setSaving(true)
    const { data: existing } = await supabase
      .from('profiles').select('id, full_name, role').eq('email', assignEmail.trim()).single()
    if (!existing) { toast('משתמש לא נמצא עם המייל הזה', 'error'); setSaving(false); return }
    const { error } = await supabase.from('profiles').update({ club_id: activeClub.id }).eq('id', existing.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast(`${existing.full_name} שובץ למועדון זה`)
    setAssignEmail('')
    setAddOpen(false)
    load()
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    const updates = { role: editForm.role }
    if (canManageClubs && editForm.club_id) updates.club_id = editForm.club_id
    const { error } = await supabase.from('profiles').update(updates).eq('id', editTarget.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('עובד עודכן')
    setEditOpen(false)
    load()
  }

  async function removeStaff(id) {
    if (!confirm(t('staff.removeConfirm'))) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  function openEdit(s) {
    setEditTarget(s)
    setEditForm({ role: s.role, club_id: s.club_id || activeClub.id })
    setEditOpen(true)
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
          {staff.map(s => {
            const rb = roleBadge(s.role)
            const RIcon = rb.icon
            return (
              <div key={s.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${rb.color}`}>
                      {s.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.full_name}</p>
                      <div className="flex items-center gap-1">
                        {RIcon && <RIcon size={11} className={rb.iconColor} />}
                        <p className="text-xs text-gray-500">{rb.label}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)}
                      className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    {s.id !== profile.id && (
                      <button onClick={() => removeStaff(s.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {s.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} /> {s.phone}</p>}
              </div>
            )
          })}
        </div>

        {staff.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <UserCog size={40} className="mx-auto mb-3 opacity-30" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Add staff modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddTab('new') }} title={t('staff.add')}>
        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-4 gap-1">
          <button type="button" onClick={() => setAddTab('new')}
            className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${addTab === 'new' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            צור חדש
          </button>
          <button type="button" onClick={() => setAddTab('existing')}
            className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${addTab === 'existing' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            שבץ קיים
          </button>
        </div>

        {addTab === 'new' ? (
          <form onSubmit={addStaff} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.fullName')} *</label>
              <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.email')} *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.phone')}</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('staff.password')} *</label>
              <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" minLength={6} />
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
        ) : (
          <form onSubmit={assignExisting} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">הזן את המייל של עובד קיים במערכת כדי לשבץ אותו למועדון הנוכחי.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">כתובת מייל *</label>
              <input required type="email" value={assignEmail}
                onChange={e => setAssignEmail(e.target.value)}
                className="input" placeholder="email@example.com" />
            </div>
            <div className="flex gap-3 mt-1">
              <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'מחפש...' : 'שבץ לסניף'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit staff modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`עריכה — ${editTarget?.full_name}`}>
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תפקיד</label>
            <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="input">
              <option value="staff">עובד</option>
              <option value="admin">מנהל</option>
              <option value="owner">בעלים</option>
            </select>
          </div>
          {canManageClubs && allClubs.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">מועדון</label>
              <select value={editForm.club_id} onChange={e => setEditForm(f => ({ ...f, club_id: e.target.value }))} className="input">
                {allClubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary flex-1">ביטול</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
