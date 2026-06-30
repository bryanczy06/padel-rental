import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co'
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (url.includes('placeholder')) {
  console.warn('Missing Supabase env vars — copy .env.example to .env and fill in your values')
}

export const supabase = createClient(url, key)
