// AuthContext.jsx - CON SUPPORTO BYPASS LOGIN
// ALLINEATO ai nomi usati da Layout.jsx

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
  
  // IMPORTANTE: Layout.jsx usa "assegnazioni" (array), non "progetti"
  const [assegnazioni, setAssegnazioni] = useState([])
  
  // Test role override per sviluppo
  const [testRoleOverride, setTestRoleOverride] = useState(null)

  // Funzione per caricare dati utente
  const loadUserData = async (authUser) => {
    try {
      console.log('🔍 Cercando persona con email:', authUser.email)
      
      // Trova persona collegata all'email
      const { data: personaData, error: personaError } = await supabase
        .from('persone')
        .select('*')
        .ilike('email', authUser.email)
        .maybeSingle() // usa maybeSingle invece di single per evitare errori

      if (personaError) {
        console.warn('⚠️ Errore query persona:', personaError)
      }
      
      if (!personaData) {
        console.warn('⚠️ Persona non trovata per:', authUser.email)
        
        // IN DEV MODE: Carica comunque tutti i progetti
        if (DEV_BYPASS_LOGIN) {
          console.log('🔧 DEV MODE: Carico tutti i progetti...')
          await loadAllProjects()
        }
        setLoading(false)
        return
      }

      console.log('✅ Persona trovata:', personaData.nome, personaData.cognome)
      setPersona(personaData)

      // Trova assegnazioni attive
      const { data: assegnazioniData, error: assError } = await supabase
        .from('assegnazioni')
        .select(`
          *,
          progetto:progetti(*)
        `)
        .eq('persona_id', personaData.id)
        .eq('attivo', true)

      if (assError) {
        console.warn('⚠️ Errore caricamento assegnazioni:', assError)
      }
      
      console.log('📋 Assegnazioni trovate:', assegnazioniData?.length || 0)

      if (assegnazioniData && assegnazioniData.length > 0) {
        // Formatta assegnazioni con progetto_id per Layout
        const assegnazioniFormatted = assegnazioniData.map(a => ({
          ...a,
          progetto_id: a.progetto?.id || a.progetto_id
        }))
        
        setAssegnazioni(assegnazioniFormatted)
        
        // Prendi la prima assegnazione attiva
        const primaAssegnazione = assegnazioniFormatted[0]
        setAssegnazione(primaAssegnazione)
        setProgetto(primaAssegnazione.progetto)
        console.log('✅ Progetto attivo:', primaAssegnazione.progetto?.nome)
      } else if (DEV_BYPASS_LOGIN) {
        console.log('🔧 DEV MODE: Nessuna assegnazione, carico tutti i progetti...')
        await loadAllProjects()
      }
    } catch (error) {
      console.error('❌ Errore caricamento dati utente:', error)
      if (DEV_BYPASS_LOGIN) {
        await loadAllProjects()
      }
    } finally {
      setLoading(false)
    }
  }

  // Carica TUTTI i progetti (per dev mode)
  const loadAllProjects = async () => {
    try {
      // Query senza filtro 'attivo' per evitare errori se colonna non esiste
      const { data: tuttiProgetti, error } = await supabase
        .from('progetti')
        .select('*')
        .order('nome')

      if (error) {
        console.error('❌ Errore caricamento progetti:', error)
        // Prova query ancora più semplice
        const { data: progetti2 } = await supabase.from('progetti').select('*')
        if (progetti2 && progetti2.length > 0) {
          setupDevProjects(progetti2)
        }
        return
      }

      console.log('📦 Progetti caricati:', tuttiProgetti?.length || 0)
      
      if (tuttiProgetti && tuttiProgetti.length > 0) {
        setupDevProjects(tuttiProgetti)
      }
    } catch (e) {
      console.error('❌ Errore loadAllProjects:', e)
    }
  }
  
  // Setup progetti per dev mode
  const setupDevProjects = (tuttiProgetti) => {
    // Crea assegnazioni virtuali per ogni progetto (come fa l'admin nel sistema reale)
    const assegnazioniVirtuali = tuttiProgetti.map(p => ({
      id: `dev-ass-${p.id}`,
      progetto_id: p.id,
      progetto: p,
      ruolo: 'admin',
      attivo: true,
      isVirtual: true // flag per indicare che è accesso admin
    }))
    
    setAssegnazioni(assegnazioniVirtuali)
    setProgetto(tuttiProgetti[0])
    setAssegnazione(assegnazioniVirtuali[0])
    
    // Crea persona fittizia se non esiste
    if (!persona) {
      setPersona({
        id: 'dev-persona',
        nome: 'Dev',
        cognome: 'Admin',
        email: DEV_USER_EMAIL
      })
    }
    
    console.log('✅ DEV Setup completato con', tuttiProgetti.length, 'progetti')
  }

  // Inizializzazione
  useEffect(() => {
    const init = async () => {
      if (DEV_BYPASS_LOGIN) {
        console.log('⚠️ BYPASS LOGIN ATTIVO')
        console.log('📧 Email configurata:', DEV_USER_EMAIL)
        
        const fakeAuthUser = {
          id: 'dev-bypass-id',
          email: DEV_USER_EMAIL
        }
        
        setUser(fakeAuthUser)
        await loadUserData(fakeAuthUser)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await loadUserData(session.user)
      } else {
        setLoading(false)
      }
    }

    init()

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
            setAssegnazioni([])
            setLoading(false)
          }
        }
      )

      return () => subscription.unsubscribe()
    }
  }, [])

  // Ruolo corrente (con override per test)
  const ruolo = testRoleOverride || assegnazione?.ruolo || 'admin'

  // Verifica se utente ha almeno un certo ruolo
  const isAtLeast = (minRole) => {
    if (DEV_BYPASS_LOGIN) return true
    
    const userLevel = ROLE_HIERARCHY[ruolo] || 0
    const minLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= minLevel
  }

  // Verifica accesso a moduli speciali
  const canAccess = (module) => {
    if (DEV_BYPASS_LOGIN) return true
    return isAtLeast('foreman')
  }

  // Cambia progetto attivo - NOME: cambiaProgetto (come Layout si aspetta)
  const cambiaProgetto = async (progettoId) => {
    console.log('🔄 Cambio progetto a:', progettoId)
    
    const nuovaAss = assegnazioni.find(a => a.progetto_id === progettoId || a.progetto?.id === progettoId)
    
    if (nuovaAss) {
      setProgetto(nuovaAss.progetto)
      setAssegnazione(nuovaAss)
      console.log('✅ Progetto cambiato:', nuovaAss.progetto?.nome)
      return true
    }
    
    console.warn('⚠️ Progetto non trovato:', progettoId)
    return false
  }

  // Logout - NOME: signOut (come Layout si aspetta)
  const signOut = async () => {
    if (DEV_BYPASS_LOGIN) {
      window.location.href = '/login'
      return
    }
    
    await supabase.auth.signOut()
    setUser(null)
    setPersona(null)
    setAssegnazione(null)
    setProgetto(null)
    setAssegnazioni([])
  }

  // Funzione per test role
  const setTestRole = (role) => {
    setTestRoleOverride(role)
  }

  const value = {
    user,
    persona,
    assegnazione,
    progetto,
    progettoId: progetto?.id,
    
    // IMPORTANTE: Layout.jsx usa questi nomi esatti
    assegnazioni,        // array di assegnazioni (non "progetti")
    ruolo,              // ruolo corrente
    cambiaProgetto,     // funzione cambio progetto (non "switchProgetto")
    signOut,            // funzione logout (non "logout")
    testRoleOverride,   // per test ruoli
    setTestRole,        // per cambiare ruolo test
    
    loading,
    isAtLeast,
    canAccess,
    
    // Alias per compatibilità
    progetti: assegnazioni.map(a => a.progetto).filter(Boolean),
    switchProgetto: cambiaProgetto,
    logout: signOut,
    
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
