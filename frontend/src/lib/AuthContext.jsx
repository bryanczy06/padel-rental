import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile } from './auth'

const AuthContext = createContext(null)
const LAST_CLUB_KEY = 'racktive_last_club_id'

export function AuthProvider({ children }) {
  const [profile, setProfile]             = useState(undefined)
  const [session, setSession]             = useState(null)
  const [activeClub, setActiveClub]       = useState(null)
  const [availableClubs, setAvailableClubs] = useState([])

  // בוחר ברירת מחדל: הסניף האחרון שנבחר (אם עדיין ברשימה) → הסניף הראשי של המשתמש → הראשון ברשימה
  function pickDefaultClub(list, prof) {
    if (!list.length) return null
    let lastId = null
    try { lastId = localStorage.getItem(LAST_CLUB_KEY) } catch {}
    return list.find(c => c.id === lastId) || list.find(c => c.id === prof.club_id) || list[0]
  }

  async function loadClubs(prof) {
    if (!prof) { setActiveClub(null); setAvailableClubs([]); return }

    if (prof.role === 'super_admin') {
      const { data } = await supabase.from('clubs').select('*').order('name')
      const list = data || []
      setAvailableClubs(list)
      const def = pickDefaultClub(list, prof)
      setActiveClub(prev => prev ? list.find(c => c.id === prev.id) || def : def)
    } else if (prof.role === 'owner') {
      const { data: ownerRows } = await supabase
        .from('club_owners').select('clubs(*)').eq('profile_id', prof.id)
      const list = (ownerRows || []).map(r => r.clubs).filter(c => c && c.active).sort((a, b) => a.name.localeCompare(b.name))
      setAvailableClubs(list)
      const def = pickDefaultClub(list, prof)
      setActiveClub(prev => prev ? list.find(c => c.id === prev.id) || def : def)
    } else {
      // admin / staff — check staff_clubs for multiple branches
      const { data: scRows } = await supabase
        .from('staff_clubs').select('club_id').eq('profile_id', prof.id)
      const clubIds = (scRows || []).map(r => r.club_id)

      if (clubIds.length > 1) {
        const { data: clubsData } = await supabase
          .from('clubs').select('*').in('id', clubIds).eq('active', true)
        const clubs = clubsData || []
        setAvailableClubs(clubs)
        const def = pickDefaultClub(clubs, prof)
        setActiveClub(prev => prev ? clubs.find(c => c.id === prev.id) || def : def)
      } else {
        const club = prof.clubs?.active ? { ...prof.clubs, id: prof.club_id } : null
        setAvailableClubs(club ? [club] : [])
        setActiveClub(club)
      }
    }
  }

  async function handleProfile(sess) {
    if (sess) {
      const prof = await getProfile()
      setProfile(prof)
      try {
        await loadClubs(prof)
      } catch (e) {
        console.error('loadClubs error:', e)
      }
    } else {
      setProfile(null)
      setActiveClub(null)
      setAvailableClubs([])
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      handleProfile(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      handleProfile(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  function switchClub(club) {
    setActiveClub(club)
    try { localStorage.setItem(LAST_CLUB_KEY, club.id) } catch {}
  }

  return (
    <AuthContext.Provider value={{
      session, profile,
      activeClub, availableClubs, switchClub,
      loading: profile === undefined,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
