import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile } from './auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [profile, setProfile]             = useState(undefined)
  const [session, setSession]             = useState(null)
  const [activeClub, setActiveClub]       = useState(null)
  const [availableClubs, setAvailableClubs] = useState([])

  async function loadClubs(prof) {
    if (!prof) { setActiveClub(null); setAvailableClubs([]); return }

    if (prof.role === 'super_admin') {
      const { data } = await supabase.from('clubs').select('*').order('name')
      setAvailableClubs(data || [])
      // default to their own club if exists, else first
      const own = (data || []).find(c => c.id === prof.club_id) || (data || [])[0] || null
      setActiveClub(prev => prev ? (data || []).find(c => c.id === prev.id) || own : own)
    } else if (prof.role === 'owner') {
      const { data } = await supabase.from('clubs').select('*').eq('owner_id', prof.id).order('name')
      setAvailableClubs(data || [])
      const own = (data || []).find(c => c.id === prof.club_id) || (data || [])[0] || null
      setActiveClub(prev => prev ? (data || []).find(c => c.id === prev.id) || own : own)
    } else {
      // admin / staff — fixed to their club
      const club = prof.clubs || null
      const clubObj = club ? { ...club, id: prof.club_id } : null
      setAvailableClubs(clubObj ? [clubObj] : [])
      setActiveClub(clubObj)
    }
  }

  async function handleProfile(sess) {
    if (sess) {
      const prof = await getProfile()
      setProfile(prof)
      await loadClubs(prof)
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
