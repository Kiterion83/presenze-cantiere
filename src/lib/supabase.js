import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper per gestire errori Supabase
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  
  if (error?.code === 'PGRST301') {
    return 'Sessione scaduta. Effettua nuovamente il login.'
  }
  
  if (error?.code === '23505') {
    return 'Questo record esiste già.'
  }
  
  if (error?.code === '23503') {
    return 'Impossibile eliminare: ci sono record collegati.'
  }
  
  return error?.message || 'Si è verificato un errore.'
}
