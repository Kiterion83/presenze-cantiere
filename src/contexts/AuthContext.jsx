// AuthContext.jsx - CON SUPPORTO BYPASS LOGIN
// Aggiungi questo al tuo AuthContext esistente o sostituiscilo temporaneamente

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// CONFIGURAZIONE SVILUPPO
// ============================================================
const DEV_BYPASS_LOGIN = true  // ⚠️ CAMBIA A false IN PRODUZIONE!

// Utente simulato in sviluppo - DEVE esistere nel DB!
const DEV_USER_EMAIL = 'giuseppe.pasquale@outlook.com'
// ============================================================

const AuthContext = createContext({})

// Gerarchia ruoli
const ROLE_HIERARCHY = {
  admin: 6,
  cm: 5,
  supervisor: 4,
  foreman: 3,
  worker: 2,
  helper: 1
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazione, setAssegnazione] = useState(null)
  const [progetto, setProgetto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progetti, setProgetti] = useState([])

  // Funzione per caricare dati utente
  const loadUserData = async (authUser) => {
    try {
      // Trova persona collegata all'email
      const { data: personaData, error: personaError } = await supabase
        .from('persone')
        .select('*')
        .eq('email', authUser.email)
        .single()

      if (personaError || !personaData) {
        console.warn('Persona non trovata per:', authUser.email)
        setLoading(false)
        return
      }

      setPersona(personaData)

      // Trova assegnazioni attive
      const { data: assegnazioniData } = await supabase
        .from('assegnazioni')
        .select(`
          *,
          progetto:progetti(*)
        `)
        .eq('persona_id', personaData.id)
        .eq('attivo', true)

      if (assegnazioniData && assegnazioniData.length > 0) {
        // Prendi la prima assegnazione attiva
        const primaAssegnazione = assegnazioniData[0]
        setAssegnazione(primaAssegnazione)
        setProgetto(primaAssegnazione.progetto)
        setProgetti(assegnazioniData.map(a => a.progetto))
      }
    } catch (error) {
      console.error('Errore caricamento dati utente:', error)
    } finally {
      setLoading(false)
    }
  }

  // Inizializzazione
  useEffect(() => {
    const init = async () => {
      // ========== BYPASS LOGIN ==========
      if (DEV_BYPASS_LOGIN) {
        console.warn('⚠️ BYPASS LOGIN ATTIVO - Caricamento utente di sviluppo...')
        
        // Simula utente auth
        const fakeAuthUser = {
          id: 'dev-bypass-id',
          email: DEV_USER_EMAIL
        }
        
        setUser(fakeAuthUser)
        await loadUserData(fakeAuthUser)
        return
      }
      // ==================================

      // Flusso normale
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await loadUserData(session.user)
      } else {
        setLoading(false)
      }
    }

    init()

    // Listener per cambi auth (solo se non in bypass)
    if (!DEV_BYPASS_LOGIN) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user)
            await loadUserData(session.user)
          } else {
            setUser(null)
            setPersona(null)
            setAssegnazione(null)
            setProgetto(null)
            setLoading(false)
          }
        }
      )

      return () => subscription.unsubscribe()
    }
  }, [])

  // Verifica se utente ha almeno un certo ruolo
  const isAtLeast = (minRole) => {
    if (DEV_BYPASS_LOGIN) return true // In dev, permetti tutto
    
    const userRole = assegnazione?.ruolo || 'helper'
    const userLevel = ROLE_HIERARCHY[userRole] || 0
    const minLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= minLevel
  }

  // Verifica accesso a moduli speciali
  const canAccess = (module) => {
    if (DEV_BYPASS_LOGIN) return true // In dev, permetti tutto
    
    // Implementa logica basata su permessi specifici
    // Per ora ritorna true se ha almeno ruolo foreman
    return isAtLeast('foreman')
  }

  // Cambia progetto attivo
  const switchProgetto = async (progettoId) => {
    if (!persona) return false

    const { data: nuovaAssegnazione } = await supabase
      .from('assegnazioni')
      .select(`
        *,
        progetto:progetti(*)
      `)
      .eq('persona_id', persona.id)
      .eq('progetto_id', progettoId)
      .eq('attivo', true)
      .single()

    if (nuovaAssegnazione) {
      setAssegnazione(nuovaAssegnazione)
      setProgetto(nuovaAssegnazione.progetto)
      return true
    }
    return false
  }

  // Logout
  const logout = async () => {
    if (DEV_BYPASS_LOGIN) {
      window.location.href = '/login'
      return
    }
    
    await supabase.auth.signOut()
    setUser(null)
    setPersona(null)
    setAssegnazione(null)
    setProgetto(null)
  }

  const value = {
    user,
    persona,
    assegnazione,
    progetto,
    progettoId: progetto?.id,
    progetti,
    loading,
    isAtLeast,
    canAccess,
    switchProgetto,
    logout,
    // Flag per sapere se siamo in bypass
    isDevMode: DEV_BYPASS_LOGIN
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export default AuthContext
