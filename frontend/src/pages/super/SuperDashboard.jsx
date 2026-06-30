import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import { Plus, Building2, Users, CircleDot, UserCog, ShieldCheck, Pencil, Trash2, ToggleLeft, ToggleRight, Crown } from 'lucide-react'

export default function SuperDashboard() {
  const { profile } = useAuth()
  const toast = useToast()

  const [clubs, setClubs]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [clubOpen, setClubOpen]   = useState(false)
  const [editOpen, setEditOpen]   = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [targetClub, setTargetClub] = useState(null)
  const [saving, setSaving]       = useState(false)

  const [ownerOpen, setOwnerOpen] = useState(false)
  const [ownerTab, setOwnerTab]   = useState('new') // 'new' | 'existing'
  const [assignEmail, setAssignEmail] = useState('')
  const [clubForm, setClubForm]   = useState({ name: '', slug: '' })
  const [editForm, setEditForm]   = useState({ name: '', slug: '' })
  const [adminForm, setAdminForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [ownerForm, setOwnerForm] = useState({ full_name: '', email: '', password: '', phone: '' })

  async function load() {
    const { data: clubsData } = await supabase.from('clubs').select('*').order('created_at')
    if (!clubsData) { setLoading(false); return }

    const enriched = await Promise.all(clubsData.map(async (club) => {
      const [{ count: staffCount }, { count: racketCount }, { count: activeRentals }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('club_id', club.id),
        supabase.from('rackets').select('*', { count: 'exact', head: true }).eq('club_id', club.id),
        supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('club_id', club.id).is('returned_at', null),
      ])
      return { ...club, staffCount, racketCount, activeRentals }
    }))

    setClubs(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createClub(e) {
    e.preventDefault()
    setSaving(true)
    const slug = clubForm.slug || clubForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { error } = await supabase.from('clubs').insert({ name: clubForm.name, slug, owner_id: profile.id })
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('מועדון נוצר בהצלחה')
    setClubForm({ name: '', slug: '' })
    setClubOpen(false)
    load()
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('clubs').update({ name: editForm.name, slug: editForm.slug }).eq('id', targetClub.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('מועדון עודכן')
    setEditOpen(false)
    load()
  }

  async function toggleActive(club) {
    const next = !club.active
    const { error } = await supabase.from('clubs').update({ active: next }).eq('id', club.id)
    if (error) { toast(error.message, 'error'); return }
    toast(next ? `${club.name} הופעל` : `${club.name} הושבת`)
    load()
  }

  async function deleteClub(club) {
    if (!confirm(`למחוק לצמיתות את "${club.name}"?\nכל הנתונים (מחבטים, השכרות, עובדים) יימחקו.`)) return
    if (!confirm('פעולה זו אינה הפיכה. אתה בטוח?')) return
    const { error } = await supabase.from('clubs').delete().eq('id', club.id)
    if (error) { toast(error.message, 'error'); return }
    toast(`${club.name} נמחק`)
    load()
  }

  async function assignExistingOwner(e) {
    e.preventDefault()
    setSaving(true)
    // find profile by email
    const { data: existing } = await supabase
      .from('profiles').select('id, full_name, role').eq('email', assignEmail.trim()).single()
    if (!existing) { toast('משתמש לא נמצא עם המייל הזה', 'error'); setSaving(false); return }

    // update role to owner if needed
    if (existing.role !== 'owner' && existing.role !== 'super_admin') {
      await supabase.from('profiles').update({ role: 'owner' }).eq('id', existing.id)
    }
    // link club to owner
    const { error } = await supabase.from('clubs').update({ owner_id: existing.id }).eq('id', targetClub.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast(`${existing.full_name} שויך כבעלים של ${targetClub.name}`)
    setAssignEmail('')
    setOwnerOpen(false)
    load()
  }

  async function createOwner(e) {
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
        body: JSON.stringify({ ...ownerForm, role: 'owner', club_id: targetClub.id }),
      }
    )
    const json = await res.json()
    if (!res.ok || json.error) { setSaving(false); toast(json.error || 'שגיאה', 'error'); return }

    // set as club owner_id
    await supabase.from('clubs').update({ owner_id: json.user_id }).eq('id', targetClub.id)
    setSaving(false)
    toast(`בעלים נוצר למועדון ${targetClub.name}`)
    setOwnerForm({ full_name: '', email: '', password: '', phone: '' })
    setOwnerOpen(false)
    load()
  }

  async function createAdmin(e) {
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
        body: JSON.stringify({ ...adminForm, role: 'admin', club_id: targetClub.id }),
      }
    )
    const json = await res.json()
    setSaving(false)
    if (!res.ok || json.error) { toast(json.error || 'שגיאה', 'error'); return }
    toast(`אדמין נוצר למועדון ${targetClub.name}`)
    setAdminForm({ full_name: '', email: '', password: '', phone: '' })
    setAdminOpen(false)
    load()
  }

  if (loading) return <Layout><Spinner /></Layout>

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={24} className="text-brand-600" /> Super Admin
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">ניהול כל המועדונים</p>
          </div>
          <button onClick={() => setClubOpen(true)} className="btn-primary">
            <Plus size={16} /> מועדון חדש
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map(club => (
            <div key={club.id} className={`card flex flex-col gap-4 ${!club.active ? 'opacity-60 border-red-200' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${club.active ? 'bg-brand-100' : 'bg-gray-100'}`}>
                    <Building2 size={20} className={club.active ? 'text-brand-600' : 'text-gray-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{club.name}</p>
                    <p className="text-xs text-gray-400">{club.slug}</p>
                  </div>
                </div>
                {!club.active && <span className="badge badge-red shrink-0">מושבת</span>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <UserCog size={14} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-lg font-bold text-gray-900">{club.staffCount ?? 0}</p>
                  <p className="text-xs text-gray-400">עובדים</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <CircleDot size={14} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-lg font-bold text-gray-900">{club.racketCount ?? 0}</p>
                  <p className="text-xs text-gray-400">מחבטים</p>
                </div>
                <div className="bg-brand-50 rounded-xl p-2 text-center">
                  <Users size={14} className="mx-auto text-brand-400 mb-1" />
                  <p className="text-lg font-bold text-brand-700">{club.activeRentals ?? 0}</p>
                  <p className="text-xs text-brand-400">פעילות</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap mt-auto">
                <button onClick={() => { setTargetClub(club); setOwnerForm({ full_name: '', email: '', password: '', phone: '' }); setOwnerOpen(true) }}
                  className="btn-secondary text-xs py-1.5 flex-1">
                  <Crown size={13} /> בעלים
                </button>
                <button onClick={() => { setTargetClub(club); setAdminForm({ full_name: '', email: '', password: '', phone: '' }); setAdminOpen(true) }}
                  className="btn-secondary text-xs py-1.5 flex-1">
                  <UserCog size={13} /> אדמין
                </button>
                <button onClick={() => { setTargetClub(club); setEditForm({ name: club.name, slug: club.slug }); setEditOpen(true) }}
                  className="btn-secondary text-xs py-1.5 px-3">
                  <Pencil size={13} />
                </button>
                <button onClick={() => toggleActive(club)}
                  className={`text-xs py-1.5 px-3 rounded-xl border font-medium transition-colors ${club.active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-brand-200 text-brand-600 hover:bg-brand-50'}`}>
                  {club.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => deleteClub(club)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {clubs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>אין מועדונים עדיין</p>
          </div>
        )}
      </div>

      {/* Create club */}
      <Modal open={clubOpen} onClose={() => setClubOpen(false)} title="מועדון חדש">
        <form onSubmit={createClub} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שם המועדון *</label>
            <input required value={clubForm.name} onChange={e => setClubForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="מועדון פאדל תל אביב" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug — אותיות אנגליות וקו מקף</label>
            <input value={clubForm.slug} onChange={e => setClubForm(f => ({ ...f, slug: e.target.value }))}
              className="input" placeholder="padel-tlv (אופציונלי)" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setClubOpen(false)} className="btn-secondary flex-1">ביטול</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'יוצר...' : 'צור מועדון'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit club */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`עריכה — ${targetClub?.name}`}>
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שם המועדון *</label>
            <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug</label>
            <input required value={editForm.slug} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
              className="input" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary flex-1">ביטול</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'שומר...' : 'שמור'}</button>
          </div>
        </form>
      </Modal>

      {/* Create/assign owner */}
      <Modal open={ownerOpen} onClose={() => { setOwnerOpen(false); setOwnerTab('new') }} title={`הגדר בעלים — ${targetClub?.name}`}>
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setOwnerTab('existing')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${ownerTab === 'existing' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            שייך קיים
          </button>
          <button onClick={() => setOwnerTab('new')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${ownerTab === 'new' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            צור חדש
          </button>
        </div>

        {ownerTab === 'existing' ? (
          <form onSubmit={assignExistingOwner} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 bg-blue-50 rounded-xl px-3 py-2">הכנס מייל של משתמש קיים במערכת</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">מייל הבעלים *</label>
              <input required type="email" value={assignEmail}
                onChange={e => setAssignEmail(e.target.value)}
                className="input" placeholder="owner@example.com" />
            </div>
            <div className="flex gap-3 mt-1">
              <button type="button" onClick={() => setOwnerOpen(false)} className="btn-secondary flex-1">ביטול</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'משייך...' : 'שייך'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={createOwner} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 bg-amber-50 rounded-xl px-3 py-2">הבעלים יוכל לנהל את כל המועדונים שלו ולעבור ביניהם</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">שם מלא *</label>
              <input required value={ownerForm.full_name} onChange={e => setOwnerForm(f => ({ ...f, full_name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">מייל *</label>
              <input required type="email" value={ownerForm.email} onChange={e => setOwnerForm(f => ({ ...f, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">טלפון</label>
              <input type="tel" value={ownerForm.phone} onChange={e => setOwnerForm(f => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">סיסמה ראשונית *</label>
              <input required type="password" minLength={6} value={ownerForm.password} onChange={e => setOwnerForm(f => ({ ...f, password: e.target.value }))} className="input" />
            </div>
            <div className="flex gap-3 mt-1">
              <button type="button" onClick={() => setOwnerOpen(false)} className="btn-secondary flex-1">ביטול</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'יוצר...' : 'צור בעלים'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create admin */}
      <Modal open={adminOpen} onClose={() => setAdminOpen(false)} title={`הוסף אדמין — ${targetClub?.name}`}>
        <form onSubmit={createAdmin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שם מלא *</label>
            <input required value={adminForm.full_name} onChange={e => setAdminForm(f => ({ ...f, full_name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">מייל *</label>
            <input required type="email" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">טלפון</label>
            <input type="tel" value={adminForm.phone} onChange={e => setAdminForm(f => ({ ...f, phone: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סיסמה ראשונית *</label>
            <input required type="password" minLength={6} value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} className="input" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setAdminOpen(false)} className="btn-secondary flex-1">ביטול</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'יוצר...' : 'צור אדמין'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
