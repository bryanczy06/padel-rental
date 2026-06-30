import { supabase } from './supabase'

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    // try with club join first
    const { data, error } = await supabase.from('profiles').select('*, clubs(name,slug,active)').eq('id', user.id).single()
    if (!error) return data ?? null
    // fallback without join (e.g. super_admin with null club_id)
    console.warn('getProfile join failed, retrying without join:', error.message)
    const { data: data2, error: error2 } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error2) { console.warn('getProfile error:', error2.message); return null }
    return data2 ?? null
  } catch (e) {
    console.warn('getProfile exception:', e)
    return null
  }
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}
