import { supabase } from './supabase'

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase.from('profiles').select('*, clubs(name,slug,active)').eq('id', user.id).single()
    if (error) { console.warn('getProfile error:', error.message); return null }
    return data ?? null
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
