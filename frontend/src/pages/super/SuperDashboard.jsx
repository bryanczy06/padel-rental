import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import Layout from '../../components/Layout'
import Modal from '../../components/Modal'
import Spinner from '../../components/Spinner'
import { Plus, Building2, Users, CircleDot, UserCog, ShieldCheck } from 'lucide-react'

export default function SuperDashboard() {
  const { profile } = useAuth()
  const toast = useToast()

  const [clubs, setClubs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [clubOpen, setClubOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [targetClub, setTargetClub] = useState(null)
  const [saving, setSaving]     = useState(false)

  const [clubForm, setClubForm] = useState({ name: '', slug: '' })
  const [adminForm, setAdminForm] = useState({ full_name: '', email: '', password: '', phone: '' })

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
    const { error } = await supabase.from('clubs').insert({
      name: clubForm.name,
      slug,
      owner_id: profile.id,
    })
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('מועדון נוצר בהצלחה')
    setClubForm({ name: '', slug: '' })
    setClubOpen(false)
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
        body: JSON.stringify({
          ...adminForm,
          role: 'admin',
          club_id: targetClub.id,
        }),
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
        {/* Header */}
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

        {/* Clubs grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map(club => (
            <div key={club.id} className="card flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{club.name}</p>
                    <p className="text-xs text-gray-400">{club.slug}</p>
                  </div>
                </div>
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

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => { setTargetClub(club); setAdminOpen(true) }}
                  className="btn-secondary text-xs py-1.5 flex-1"
                >
                  <UserCog size={13} /> הוסף אדמין
                </button>
                <a
                  href={`/join?club=${club.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs py-1.5 flex-1 text-center"
                >
                  קישור לקוח
                </a>
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

      {/* Create club modal */}
      <Modal open={clubOpen} onClose={() => setClubOpen(false)} title="מועדון חדש">
        <form onSubmit={createClub} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שם המועדון *</label>
            <input required value={clubForm.name}
              onChange={e => setClubForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="מועדון פאדל תל אביב" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Slug (לURL) — אותיות אנגליות וקו מקף
            </label>
            <input value={clubForm.slug}
              onChange={e => setClubForm(f => ({ ...f, slug: e.target.value }))}
              className="input" placeholder="padel-tlv (אופציונלי, ייווצר אוטומטית)" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setClubOpen(false)} className="btn-secondary flex-1">ביטול</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'יוצר...' : 'צור מועדון'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create admin modal */}
      <Modal open={adminOpen} onClose={() => setAdminOpen(false)} title={`הוסף אדמין — ${targetClub?.name}`}>
        <form onSubmit={createAdmin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שם מלא *</label>
            <input required value={adminForm.full_name}
              onChange={e => setAdminForm(f => ({ ...f, full_name: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">מייל *</label>
            <input required type="email" value={adminForm.email}
              onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">טלפון</label>
            <input type="tel" value={adminForm.phone}
              onChange={e => setAdminForm(f => ({ ...f, phone: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">סיסמה ראשונית *</label>
            <input required type="password" minLength={6} value={adminForm.password}
              onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
              className="input" />
          </div>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => setAdminOpen(false)} className="btn-secondary flex-1">ביטול</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'יוצר...' : 'צור אדמין'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
