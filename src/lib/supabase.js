/**
 * Client Supabase e funzioni database
 * Gestione connessione, CRUD presenze, rapportini
 */

import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase da variabili ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Crea client (o mock se non configurato)
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

/**
 * Verifica se Supabase è configurato
 */
export function isSupabaseConfigurato() {
  return supabase !== null
}

// ============ AUTENTICAZIONE ============

/**
 * Login utente
 */
export async function login(email, password) {
  if (!supabase) {
    // Mock per sviluppo
    return {
      success: true,
      user: { id: '1', email, nome: 'Utente Test', ruolo: 'Foreman' },
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}

/**
 * Logout utente
 */
export async function logout() {
  if (!supabase) return { success: true }
  
  const { error } = await supabase.auth.signOut()
  return { success: !error, error: error?.message }
}

// ============ FOREMAN ============

/**
 * Ottiene lista foreman
 */
export async function getForeman() {
  if (!supabase) {
    // Dati mock
    return {
      data: [
        { id: 1, nome: 'Mario Rossi', email: 'mario@test.it' },
        { id: 2, nome: 'Giuseppe Verdi', email: 'giuseppe@test.it' },
        { id: 3, nome: 'Luigi Bianchi', email: 'luigi@test.it' },
      ],
    }
  }

  return await supabase.from('foreman').select('*').order('nome')
}

// ============ OPERAI ============

/**
 * Ottiene operai di un foreman
 */
export async function getOperaiByForeman(foremanId) {
  if (!supabase) {
    // Dati mock
    return {
      data: [
        { id: 1, nome: 'Franco Neri', specializzazione: 'Saldatore', foreman_id: foremanId },
        { id: 2, nome: 'Antonio Gialli', specializzazione: 'Tubista', foreman_id: foremanId },
        { id: 3, nome: 'Marco Blu', specializzazione: 'Elettricista', foreman_id: foremanId },
        { id: 4, nome: 'Paolo Viola', specializzazione: 'Meccanico', foreman_id: foremanId },
      ],
    }
  }

  return await supabase
    .from('operai')
    .select('*')
    .eq('foreman_id', foremanId)
    .order('nome')
}

/**
 * Trasferisce operaio ad altro foreman
 */
export async function trasferisciOperaio(operaioId, nuovoForemanId) {
  if (!supabase) {
    return { success: true }
  }

  const { error } = await supabase
    .from('operai')
    .update({ foreman_id: nuovoForemanId })
    .eq('id', operaioId)

  return { success: !error, error: error?.message }
}

// ============ RAPPORTINI ============

/**
 * Salva rapportino giornaliero
 */
export async function salvaRapportino(rapportino) {
  if (!supabase) {
    console.log('Mock: salvataggio rapportino', rapportino)
    return { success: true, data: { id: Date.now() } }
  }

  const { data, error } = await supabase
    .from('rapportini')
    .insert(rapportino)
    .select()
    .single()

  return { success: !error, data, error: error?.message }
}

/**
 * Ottiene rapportini per data
 */
export async function getRapportiniByData(data) {
  if (!supabase) {
    return { data: [] }
  }

  return await supabase
    .from('rapportini')
    .select('*, foreman(*), centro_costo(*)')
    .eq('data', data)
}

/**
 * Ottiene rapportini pending (da approvare)
 */
export async function getRapportiniPending() {
  if (!supabase) {
    return {
      data: [
        {
          id: 1,
          data: '2024-01-15',
          foreman: { nome: 'Mario Rossi' },
          centro_costo: { codice: 'CC-004', fase: 'Piping Processo' },
          ore_totali: 32,
          stato: 'pending',
        },
      ],
    }
  }

  return await supabase
    .from('rapportini')
    .select('*, foreman(*), centro_costo(*)')
    .eq('stato', 'pending')
    .order('data', { ascending: false })
}

/**
 * Approva rapportino
 */
export async function approvaRapportino(rapportinoId) {
  if (!supabase) {
    return { success: true }
  }

  const { error } = await supabase
    .from('rapportini')
    .update({ stato: 'approved', approvato_il: new Date().toISOString() })
    .eq('id', rapportinoId)

  return { success: !error, error: error?.message }
}

// ============ PRESENZE ============

/**
 * Salva presenza singola
 */
export async function salvaPresenza(presenza) {
  if (!supabase) {
    console.log('Mock: salvataggio presenza', presenza)
    return { success: true }
  }

  const { error } = await supabase.from('presenze').insert(presenza)

  return { success: !error, error: error?.message }
}

/**
 * Ottiene presenze mensili
 */
export async function getPresenzeMensili(anno, mese) {
  if (!supabase) {
    // Mock
    return { data: [] }
  }

  const inizioMese = `${anno}-${String(mese + 1).padStart(2, '0')}-01`
  const fineMese = new Date(anno, mese + 1, 0).toISOString().split('T')[0]

  return await supabase
    .from('presenze')
    .select('*, operaio(*), rapportino(*)')
    .gte('rapportino.data', inizioMese)
    .lte('rapportino.data', fineMese)
}

// ============ STATISTICHE ============

/**
 * Ottiene ore spese per centro di costo
 */
export async function getOrePerCentroCosto() {
  if (!supabase) {
    // Mock
    return {
      data: [
        { codice: 'CC-001', ore_spese: 95 },
        { codice: 'CC-002', ore_spese: 380 },
        { codice: 'CC-003', ore_spese: 150 },
        { codice: 'CC-004', ore_spese: 420 },
        { codice: 'CC-005', ore_spese: 90 },
        { codice: 'CC-006', ore_spese: 200 },
        { codice: 'CC-007', ore_spese: 110 },
        { codice: 'CC-008', ore_spese: 80 },
        { codice: 'CC-009', ore_spese: 45 },
        { codice: 'CC-010', ore_spese: 30 },
        { codice: 'CC-011', ore_spese: 60 },
        { codice: 'CC-012', ore_spese: 20 },
      ],
    }
  }

  // Query aggregata
  return await supabase.rpc('get_ore_per_centro_costo')
}

/**
 * Ottiene trend settimanale
 */
export async function getTrendSettimanale() {
  if (!supabase) {
    // Mock
    return {
      data: [
        { giorno: 'Lun', ore: 45 },
        { giorno: 'Mar', ore: 52 },
        { giorno: 'Mer', ore: 48 },
        { giorno: 'Gio', ore: 55 },
        { giorno: 'Ven', ore: 42 },
        { giorno: 'Sab', ore: 20 },
      ],
    }
  }

  return await supabase.rpc('get_trend_settimanale')
}
